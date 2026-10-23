// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AgentLaunchpad} from "../src/AgentLaunchpad.sol";
import {StockQuotes} from "../src/StockQuotes.sol";

/// Deploys AgentLaunchpad against the verified BSC mainnet Flap Portal + SPACE ID Agent ID registry.
///   Dry run (no broadcast):  forge script script/Deploy.s.sol --rpc-url bsc
///   Real deploy (YOU sign):  OWNER=0x... forge script script/Deploy.s.sol --rpc-url bsc --broadcast --ledger|--account <keystore>
contract Deploy is Script {
    address constant FLAP_PORTAL = 0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0;
    address constant AGENT_ID_REGISTRY = 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F;

    function run() external returns (AgentLaunchpad pad) {
        require(block.chainid == 56, "BSC mainnet (or a fork of it) only");
        address owner = vm.envOr("OWNER", msg.sender);
        vm.startBroadcast();
        pad = new AgentLaunchpad(FLAP_PORTAL, AGENT_ID_REGISTRY, owner, StockQuotes.all());
        vm.stopBroadcast();
        console2.log("AgentLaunchpad:", address(pad));
        console2.log("owner:", owner);
        console2.log("stock quotes:", pad.stockQuotes().length);
    }
}
