# Agent Launchpad (BNB Chain)

This is an agent-only token launchpad on BNB Chain built on [Flap.sh](https://flap.sh). It has two rules, and both are enforced on-chain by `contracts/src/AgentLaunchpad.sol`:

1. **Only wallets that hold a Binance .ai Agent ID can launch.** The ID is the SPACE ID soulbound "Agent ID" NFT used by Binance Agentic Wallet. `launch()` checks `agentIdRegistry.balanceOf(msg.sender) > 0`.
2. **Every token is paired with a tokenized stock as its Flap quote token.** The owner manages the allowlist, which holds 35 stocks/ETFs: bStocks, xStocks and Ondo.

Humans get a read-only explorer and **no launch button**. Agents use the CLI or the HTTP API together with `baw contract-call`.

```
contracts/   Foundry: AgentLaunchpad.sol, StockQuotes.sol, interfaces, fork tests, Deploy.s.sol
lib/         TypeScript core (viem): config, ABI, salt finder, Pinata upload, calldata builder, chain reads
cli/         agent-launch.ts (preflight|stocks|upload|salt|build|prepare|launches), salt.ts
app/         Next.js 14 explorer + agent HTTP API (port 3200)
skill/       SKILL.md for agents (Binance Agentic Wallet flow)
scripts/     e2e-fork.sh: full rehearsal on a local anvil fork of BSC mainnet
shared/      stocks.json (verified stock quote list)
```

## Verified addresses (BSC mainnet, chainId 56)

| Contract | Address | How it was verified |
|---|---|---|
| SPACE ID **Agent ID** registry (`HandleRegistry`, name "SPACE ID Agent ID", symbol `AI`) | `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` | Exact-match source on Sourcify. Referenced as "Agent ID (SPACE ID)" by gang.fun and agentidlive.ai. On-chain: `handleOf(0x86618B…15D4) = "mamu908"`, `ownerOfHandle("binance") = 0x5E3fBbc8…75eA`, `ownerOfHandle("heyi") = 0x72B73415…c3004` |
| Flap Portal (v5.26.0 on-chain) | `0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0` | docs.flap.sh "deployed contract addresses", plus `version()` |
| Flap Standard Token V3 impl (V7, vanity `…8888`) | `0x88881b6f03090462a969eC7f48385744Eeb63333` | docs.flap.sh, plus the CREATE2 prediction matched on the fork |
| Flap Tax Token V3 impl (V6 TAXED_V3, vanity `…7777`) | `0x024f18294970B5c76c0691b87f138A0317156422` | docs.flap.sh, plus the CREATE2 prediction matched on the fork |
| Stock quote tokens (35) | `shared/stocks.json` / `contracts/src/StockQuotes.sol` | `https://flap.sh/api/launch/quote-tokens` (category rwa). Each was checked on-chain: `symbol()` matches and `Portal.getQuoteTokenConfiguration(t).enabled == 1` |

Key stock quotes:
- NVDAB `0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436`
- AAPLB `0x431a3BEE82E2ca41e49895CbECE5bB0F76A89b7A`
- TSLAB `0x5b1910eAaD6450E50f816082Aa078C41F10C292f`

Prior art confirms that Flap natively supports stock quotes: bInference `0x9862…7777` is a Flap tax token quoted in NVDAB.

Excluded from the allowlist, although Flap enables them:
- XAUT (gold, 6 decimals);
- pPOLY, xKLSH and oANTHROPIC (not listed stocks);
- USDT.

## How the Agent ID check works
- The registry is soulbound: `_update` reverts once a token is minted and `approve` reverts. It allows one handle per address, with `tokenId = keccak256(handle)`. The SPACE ID signer mints it via `register(handle, deadline, sig)`.
- `AgentLaunchpad.launch()` reads `balanceOf(msg.sender)`. A wallet with a zero balance reverts with `NotAgent(address)` (`0x52f49c95`).
- On success, the handle from `handleOf(msg.sender)` is stored in the `Launch` record and emitted in `AgentTokenLaunched`.
- Binance Agentic Wallets are EOAs and call the wrapper directly, so the check uses `msg.sender`. `tx.origin` and off-chain signatures are not involved.

## Launch flow (inside the wrapper)
1. `paused`, `NotAgent`, `QuoteNotAllowed` and token-version checks.
2. `transferFrom(agent → wrapper, quoteAmt)`, with an exact-amount check. Stock tokens run compliance checks on transfer.
3. `forceApprove(Portal)`, then one of:
   - **standard**: `Portal.newTokenV7` with `TOKEN_V3_PERMIT`, migrator `PCS_INFINITY_CL` and a dividend fee slot paid in the stock;
   - **tax**: `Portal.newTokenV6` with `TOKEN_TAXED_V3` and the V2 migrator. The tax beneficiary is the agent; dividends are paid in the stock by default.
4. Dev-buy tokens are forwarded to the agent. Allowance and dust are reset or refunded.
5. The launch is recorded (`getLaunches`, `launchesByCreator`) and `AgentTokenLaunched` is emitted.

Fork findings on Flap v5.26:
- `newTokenV6` with `TOKEN_V2_PERMIT` reverts `FeatureDisabled()`.
- `newTokenV7` accepts only a single DIVIDEND fee slot. `MARKETING_OR_VAULT` reverts `NewTokenV7RuleViolation(8)`.
- Tax tokens with an ERC20 quote need a non-zero `dividendToken`. The wrapper defaults it to the stock quote.

## Quick start
```bash
npm install
export PATH=$HOME/.foundry/bin:$PATH
(cd contracts && forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-git)  # lib/ is not shipped in the zip
cp env.example .env.local   # Pinata creds (PINATA_JWT or API key+secret); also read from ../launchpad-mvp/.env.local
```

### Tests (mainnet fork, no transactions sent)
```bash
cd contracts && BSC_RPC_URL=https://bsc-mainnet.public.blastapi.io forge test -vv
```
This needs an archive-capable RPC. publicnode refuses old-state reads; drpc and blastapi work but are rate-limited, so rerun if a cold run hits limits. All 10 tests pass:

| Test | What it proves |
|---|---|
| `test_RegistryAndHolderAreReal` | Real registry, real holder `mamu908`, and the holder is an EOA |
| `test_RevertWhen_NonAgentLaunches` | A non-holder reverts with `NotAgent` |
| `test_AgentLaunchesStandardTokenPairedWithNVDAB` | An impersonated real holder launches through the real Portal with a 1 NVDAB dev buy. The token lands at the predicted `…8888` address, its quote is NVDAB, and the agent receives about 5.96e7 tokens |
| `test_AgentLaunchesTaxTokenPairedWithNVDAB` | 3%/3% tax token at `…7777` with NVDAB as quote |
| `test_AgentLaunchesWithoutDevBuy` | AAPLB quote, quoteAmt = 0 |
| `test_RevertWhen_QuoteNotAllowlisted_USDT` | USDT is enabled on Flap but not allowlisted, so it reverts |
| `test_RevertWhen_QuoteNotAllowlisted_NativeBNB` | Native BNB reverts |
| `test_RevertWhen_QuoteRemovedFromAllowlist` | The owner removes NVDAB, then a launch with it reverts |
| `test_OnlyOwnerManagesAllowlist` | Only the owner can manage the allowlist |
| `test_RevertWhen_Paused` | Launches revert while paused |

### End-to-end rehearsal (anvil fork, uses the CLI's calldata)
```bash
npm run e2e:fork
```
The script:
1. Forks BSC and deploys with `Deploy.s.sol`.
2. Impersonates the real holders `mamu908.ai` and `heyi.ai`.
3. Builds approve and launch calldata with `cli/agent-launch.ts`.
4. Sends exactly those `{from,to,value,data}` transactions, which stands in for `baw contract-call`.

It launches 4 tokens: NVDAB standard, NVDAB tax, AAPLB and TSLAB. It also shows that a wallet without an Agent ID reverts. Measured gas:

| Transaction | Gas |
|---|---|
| approve | ~54k |
| standard launch | 2.5–3.0M |
| tax launch | ~6.3M |

All are within baw's `--gasLimit` cap of 15M.

### Agent CLI
```bash
npm run agent -- preflight --agent 0x…  [--quote NVDAB]
npm run agent -- upload    --agent 0x… --image logo.png [--description …] [--flap-pin]
npm run agent -- salt      --type standard|tax          # cast create2 (Rust, ~5–30 ms) or JS worker_threads (~0.1–0.4 s)
npm run agent -- build     --agent 0x… --name … --symbol … --meta <cid> --quote NVDAB --dev-buy 1 [--type tax --tax 300]
npm run agent -- launches
```
`build` prints the transactions and the exact `baw contract-call preview … --json` and `baw contract-call execute --requestId … --json` commands. See `skill/SKILL.md`.

### Web + HTTP API (port 3200)
```bash
npm run build && npm start      # or npm run dev
```
- `/`: launches showing the stock pair, the creator's `.ai` handle, the Flap status and progress, and BscScan, Flap, launch-tx and metadata links. It also has a "How agents launch" section and the stock allowlist. There is no launch button.
- `GET /api/launches`, `GET /api/stocks`, `GET /api/agent/:address`, `GET /api/salt?type=`
- `POST /api/upload` (multipart). Only Agent ID holders can use it, and an optional `x-api-key` can be required.
- `POST /api/build`

## Mainnet deployment (you sign; nothing here broadcasts)
1. Dry run: `cd contracts && BSC_RPC_URL=https://bsc-rpc.publicnode.com forge script script/Deploy.s.sol --rpc-url bsc`. Estimated gas is about 5.6M, roughly 0.0003 BNB at 0.05 gwei.
2. Deploy: `OWNER=<multisig> forge script script/Deploy.s.sol --rpc-url bsc --broadcast --account <keystore>` (or `--ledger`). Then verify: `forge verify-contract <addr> src/AgentLaunchpad.sol:AgentLaunchpad --chain bsc --constructor-args $(cast abi-encode "c(address,address,address,address[])" …)`.
3. If you used a deployer EOA, `transferOwnership(multisig)` and then `acceptOwnership()`, because the contract is Ownable2Step.
4. Set `LAUNCHPAD_ADDRESS`, `NEXT_PUBLIC_LAUNCHPAD_ADDRESS`, `LAUNCHPAD_DEPLOY_BLOCK` and `BSC_RPC_URL=https://bsc-rpc.publicnode.com` in `.env.local`. Remove `DATA_SOURCE_LABEL` or set it to "BSC mainnet". Then `npm run build && npm start`.
5. Do a small smoke launch from a real Agentic Wallet with `--dev-buy 0`.

## Limits and known issues
- **No testnet.** The Agent ID registry and the stock tokens exist only on BSC mainnet. Flap's testnet Portal (`0x5bEacaF7…510e9`) has neither, and BSC testnet faucets need captcha or login. All verification is therefore done on mainnet forks.
- **Flap sees the wrapper as `creator`.** Creator-only Flap UI features belong to the wrapper, not the agent. The agent is still the tax beneficiary for tax tokens and receives the dev-buy tokens. Standard V7 tokens send fees to holders as stock dividends, so there is no creator fee for them.
- **Stock compliance.** bStocks transfers run `checkIsCompliant`. Transfers to the wrapper and the Portal passed on the fork, but issuers can restrict addresses or jurisdictions at any time.
- **Allowlist is a snapshot.** If Flap disables a quote, the Portal call reverts. `setStockQuote` re-checks that the quote is enabled on Flap.
- **Paired stock is fixed.** The Flap quote is fixed at launch. Swapping to BNB requires `nativeToQuoteSwap` support per token.
- **Metadata gateway.** Images load from your Pinata gateway. Use `--flap-pin` so they also load on Flap's gateway.
- **Explorer data.** Launch tx hashes come from the last `LOG_WINDOW` blocks (default 10k). The launch list itself is read from contract storage.
- **No audit.** This is an MVP and the contract has not been audited.
