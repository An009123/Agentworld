#!/usr/bin/env bash
# End-to-end rehearsal on a LOCAL anvil fork of BSC mainnet (nothing is broadcast to mainnet).
# 1. fork mainnet  2. deploy AgentLaunchpad  3. impersonate real .ai Agent ID holders (stand-in for baw signing)
# 4. build approve+launch calldata with the agent CLI  5. send it exactly as baw would (from/to/data/value)
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.foundry/bin:$PATH"
UPSTREAM=${FORK_RPC_URL:-https://bsc-mainnet.public.blastapi.io}   # needs archive state (publicnode refuses old-state reads)
PORT=${ANVIL_PORT:-8545}
RPC=http://127.0.0.1:$PORT
META=${META_CID:-bafkreigdbvx24qijqrkxbgznx4vlguuxb7nzblffgt2dk3p3phsqtern2y}
AGENT1=0x86618B6B44E5459b5D1e9cce05Ba0dadBe7215D4   # mamu908.ai (verified holder)
AGENT2=0x72B73415e263C2b976B2770ee764BACD02ec3004   # heyi.ai   (verified holder)
HUMAN=0x000000000000000000000000000000000000bEEF
NVDAB=$(jq -r '.stocks[]|select(.symbol=="NVDAB").address' shared/stocks.json)   # verified list
PAIR=0x25EE4Fa4BFf5363d47496e68377B1241E8E21a47     # bInference/NVDAB PancakeV2 pair, used only as NVDAB source on the fork
DEPLOYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80   # anvil's public dev key #0 (local only)

if ! cast chain-id --rpc-url $RPC >/dev/null 2>&1; then
  nohup anvil --fork-url "$UPSTREAM" --port $PORT --chain-id 56 --accounts 1 --compute-units-per-second 40 --fork-retry-backoff 2000 --retries 10 --silent > /tmp/anvil-bsc.log 2>&1 &
  for i in $(seq 1 60); do cast chain-id --rpc-url $RPC >/dev/null 2>&1 && break; sleep 1; done
fi
[ "$(cast chain-id --rpc-url $RPC)" = 56 ] || { echo "anvil not up"; exit 1; }
case "$RPC" in http://127.0.0.1*|http://localhost*) ;; *) echo "refusing non-local RPC"; exit 1;; esac

echo "== deploy"
(cd contracts && forge script script/Deploy.s.sol --rpc-url $RPC --broadcast --private-key $DEPLOYER_PK -q 2>&1) | grep -E "AgentLaunchpad:|stock quotes" || true
PAD=$(jq -r '.transactions[] | select(.transactionType=="CREATE") | .contractAddress' contracts/broadcast/Deploy.s.sol/56/run-latest.json | tail -1)
PAD=$(cast to-check-sum-address $PAD); echo "AgentLaunchpad $PAD"; echo $PAD > /tmp/e2e-pad.txt
DEPLOY_BLOCK=$(( $(jq -r ".receipts[0].blockNumber" contracts/broadcast/Deploy.s.sol/56/run-latest.json) )); echo "deploy block $DEPLOY_BLOCK"

echo "== fund agents (fork only)"
for a in $AGENT1 $AGENT2 $HUMAN $PAIR; do cast rpc anvil_impersonateAccount $a --rpc-url $RPC >/dev/null; cast rpc anvil_setBalance $a 0x8AC7230489E80000 --rpc-url $RPC >/dev/null; done
for a in $AGENT1 $AGENT2 $HUMAN; do cast send $NVDAB "transfer(address,uint256)" $a 3000000000000000000 --from $PAIR --unlocked --rpc-url $RPC -q; done

send_plan () { # $1 = json plan from CLI; sends each tx as the agent (baw contract-call equivalent)
  local n=$(echo "$1" | jq '.txs|length')
  for i in $(seq 0 $((n-1))); do
    local from=$(echo "$1" | jq -r ".txs[$i].from") to=$(echo "$1" | jq -r ".txs[$i].to") data=$(echo "$1" | jq -r ".txs[$i].data") step=$(echo "$1" | jq -r ".txs[$i].step")
    local gas=$(cast estimate --from $from $to $data --rpc-url $RPC)
    local h=$(cast send --from $from --unlocked $to $data --rpc-url $RPC --gas-limit $((gas*12/10)) --json | jq -r .transactionHash)
    local used=$(cast receipt $h gasUsed --rpc-url $RPC) st=$(cast receipt $h status --rpc-url $RPC)
    echo "  $step  estimate=$gas gasUsed=$used status=$st"
  done
}
cli () { LAUNCHPAD_ADDRESS=$PAD BSC_RPC_URL=$RPC npx tsx cli/agent-launch.ts "$@"; }

echo "== preflight"; cli preflight --agent $AGENT1 --quote NVDAB | jq -c '{handle,hasAgentId,isEOA,wrapperIsAgent,quote}'
echo "== agent1 standard token / NVDAB (1 NVDAB dev buy)"
send_plan "$(cli build --agent $AGENT1 --name 'Agent Alpha' --symbol ALPHA --meta $META --quote NVDAB --dev-buy 1)"
echo "== agent1 tax token 3% / NVDAB"
send_plan "$(cli build --agent $AGENT1 --name 'Mamu Tax' --symbol MTAX --meta $META --quote NVDAB --dev-buy 0.5 --type tax --tax 300)"
echo "== agent2 standard token / AAPLB (no dev buy)"
send_plan "$(cli build --agent $AGENT2 --name 'Heyi Apple Agent' --symbol HAPL --meta $META --quote AAPLB)"
echo "== agent2 standard token / TSLAB (no dev buy)"
send_plan "$(cli build --agent $AGENT2 --name 'Heyi Tesla Agent' --symbol HTSL --meta $META --quote TSLAB)"

echo "== negative: human (no Agent ID) must revert"
PLAN=$(cli build --agent $HUMAN --name Human --symbol HUM --meta $META --quote NVDAB --dev-buy 1)
cast send --from $HUMAN --unlocked $NVDAB "approve(address,uint256)" $PAD 1000000000000000000 --rpc-url $RPC -q
if cast estimate --from $HUMAN $PAD $(echo "$PLAN" | jq -r '.txs[-1].data') --rpc-url $RPC 2>/tmp/neg.txt; then echo "  UNEXPECTED SUCCESS"; exit 1; else echo "  reverted: $(grep -o 'NotAgent([^)]*)' /tmp/neg.txt | head -1 || grep -o 'revert.*' /tmp/neg.txt | head -1)"; fi

echo "== launches"; cli launches | jq -c '.[] | {agent,pair,token,tokenVersion}'
