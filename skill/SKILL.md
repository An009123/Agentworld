---
name: agent-launchpad-bsc
description: Launch a Flap.sh token on BNB Chain that is paired with a tokenized stock (NVDAB, AAPLB, TSLAB, ...) through the AgentLaunchpad wrapper, signing with Binance Agentic Wallet (baw). Only wallets that hold a SPACE ID .ai Agent ID can launch.
version: 0.1.0
requires: [node>=20, "@binance/agentic-wallet (baw) >= 1.11.0", "this repo (npm install)"]
---

# Agent Launchpad (BNB Chain · Flap · tokenized stocks)

You are an AI agent with a Binance Agentic Wallet. This skill turns a token idea into two signed
contract calls: `approve` (only if you dev-buy) and `AgentLaunchpad.launch`. The CLI never holds keys and
never broadcasts. Every transaction is signed by **your** wallet with `baw contract-call`.

## Hard rules
- **Chain:** BSC mainnet only (`--binanceChainId 56`). Never use any other chain id for this skill.
- **Agent ID:** `launch()` reverts with `NotAgent(address)` (selector `0x52f49c95`) unless your wallet
  holds a SPACE ID **.ai Agent ID**. The registry is `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`, a
  soulbound ERC-721. Mint one in the Binance App first.
- **Quote token:** it must be an allowlisted stock (`npm run agent -- stocks`). Any other quote reverts with
  `QuoteNotAllowed`. That includes BNB, USDT and every non-stock token.
- **Confirm before signing:** always show the user the `preview` output (`parsedTx`, `simulationResult`,
  `risks`, `allowanceChanges`) and get explicit confirmation before `execute`. If preview fails, stop.
- **Secrets:** never print Pinata secrets (`PINATA_JWT`, `PINATA_API_KEY`, `PINATA_SECRET_API_KEY`).
  `preflight` reports only `set`/`unset`.
- **Gas:** do not pass `--gasLimit` unless the user asks for one. The baw backend estimates gas.
  Gas measured on a mainnet fork:
  - approve: about 55k;
  - standard launch: about 2.5–3.0M;
  - tax launch: about 6.3M.
  All of these are below baw's 15M cap.

## Addresses (BSC mainnet, verified)
| What | Address |
|---|---|
| AgentLaunchpad (this wrapper) | `$LAUNCHPAD_ADDRESS`. Set it after deployment. The demo fork used `0xB30BF8c00b01491dAB4219131266a0f4655BA8be`. |
| Flap Portal v5.26 | `0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0` |
| Agent ID registry (SPACE ID, symbol `AI`) | `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` |
| NVDAB / AAPLB / TSLAB (bStocks) | `0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436` / `0x431a3BEE82E2ca41e49895CbECE5bB0F76A89b7A` / `0x5b1910eAaD6450E50f816082Aa078C41F10C292f` |

## Step 0: wallet preflight (baw)
```bash
baw wallet status --json                 # not signed in? baw auth signin --json  ->  baw auth verify --qrCodeId <id> --json
baw wallet settings --json               # devMode.enabled MUST be true (Binance App > Agentic Wallet > Developer Mode)
baw wallet address --json                # use the BSC address as AGENT below
npm run agent -- preflight --agent $AGENT --quote NVDAB
```
Continue only when `hasAgentId: true`, `isEOA: true`, and `wrapperIsAgent: true` (once the wrapper is
configured). Keep a little BNB for gas.

If you want a dev buy, you need the stock token first. For example, with baw:
`baw market-order swap --fromToken <USDT or BNB> --toToken 0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436 --fromTokenQty <qty> --binanceChainId 56 --json`.

## Step 1: metadata (Pinata to IPFS, Flap format)
```bash
npm run agent -- upload --agent $AGENT --image ./logo.png --description "What the token is" \
  [--website https://...] [--twitter handle] [--telegram t.me/...] [--flap-pin]
```
This returns `{ imageCid, metaCid }`. Use `metaCid` as `--meta`. `--flap-pin` also asks Flap to pin both CIDs
so that they load on `flap.mypinata.cloud`. The HTTP alternative is
`curl -F image=@logo.png -F agent=$AGENT http://<host>:3200/api/upload`.

## Step 2: salt + calldata
```bash
# standard token (Flap TOKEN_V3_PERMIT via newTokenV7; fees become holder dividends in the stock)
npm run agent -- build --agent $AGENT --name "My Agent Token" --symbol MAT --meta <metaCid> --quote NVDAB --dev-buy 1
# tax token (Flap TAXED_V3 via newTokenV6; e.g. 3% buy/sell tax with 100% going to your wallet)
npm run agent -- build --agent $AGENT --name "My Agent Tax" --symbol MATX --meta <metaCid> --quote NVDAB --dev-buy 1 --type tax --tax 300
```
Other build options:
- tax options: `--sell-tax`, `--tax-days`, `--mkt-bps`, `--deflation-bps`, `--dividend-bps`, `--lp-bps`. The four shares
  must sum to 10000.
- `--anti-farmer-days`.
- `--salt 0x…` reuses a salt. By default a vanity salt is mined: the address ends in `8888` for standard
  tokens and `7777` for tax tokens.
- `npm run agent -- salt --type standard|tax` mines a salt on its own.

The output has `txs[]`, each with `from`, `to`, `value` (always `0`), `data`, and the exact baw commands.
HTTP alternative: `POST /api/build` with JSON
`{agent,name,symbol,meta,quote,devBuy,type,buyTaxBps,...}`.

## Step 3: sign with Binance Agentic Wallet (in order, one at a time)
```bash
# only if txs[0].step == "approve"
baw contract-call preview --binanceChainId 56 --from $AGENT --to <stock token> --value 0 --inputData <txs[0].data> --json
#   -> show parsedTx / risks / allowanceChanges to the user, get confirmation
baw contract-call execute --requestId <requestId> --json
# launch
baw contract-call preview --binanceChainId 56 --from $AGENT --to $LAUNCHPAD_ADDRESS --value 0 --inputData <launch data> --json
baw contract-call execute --requestId <requestId> --json
```
Possible `execute` results:
- `BROADCASTED` with a `txHash`: submitted, not yet final. Wait for the approve to be mined before you preview the launch, because the launch simulation needs the allowance.
- `PENDING_CONFIRMATION`: the user must approve in the Binance App.

If you get an abnormal-transaction prompt, the Binance wallet settings "Abnormal Transaction Handling =
NeedConfirmation" and "Tradable Tokens = All" are needed. The Flap tutorial requires them too.

## Step 4: verify
```bash
npm run agent -- launches --limit 5
```
This lists your token with its stock pair, your `.ai` handle, and links to BscScan and Flap
(`https://flap.sh/bnb/<token>`). You receive the dev-buy tokens directly.

## Errors
| Revert | Meaning |
|---|---|
| `NotAgent(addr)` `0x52f49c95` | Wallet has no .ai Agent ID |
| `QuoteNotAllowed(token)` `0x49018d50` | Quote token is not an allowlisted stock |
| `UnsupportedTokenVersion` | Only 7 (standard) or 6 (tax) are supported |
| `IsPaused()` | Owner paused launches |
| `BadQuoteTransfer` | Stock token transfer delivered a different amount (compliance or fee) |
| ERC20 allowance error | The approve was not mined yet, or the amount was too small |
| `simulationCode != 000000000` in preview | Read `simulationErrorDetail`. Do not execute. |
