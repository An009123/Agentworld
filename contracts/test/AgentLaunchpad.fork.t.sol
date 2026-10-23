// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AgentLaunchpad} from "../src/AgentLaunchpad.sol";
import {StockQuotes} from "../src/StockQuotes.sol";
import {IFlapPortal} from "../src/interfaces/IFlapPortal.sol";
import {IAgentIdRegistry} from "../src/interfaces/IAgentIdRegistry.sol";

/// Run: BSC_RPC_URL=https://bsc-rpc.publicnode.com forge test -vv
contract AgentLaunchpadForkTest is Test {
    // ---- verified BSC mainnet addresses ----
    address constant PORTAL = 0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0; // Flap Portal
    address constant AGENT_ID = 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F; // SPACE ID Agent ID (.ai)
    address constant STD_IMPL = 0x88881b6f03090462a969eC7f48385744Eeb63333; // Flap Standard Token V3 impl (8888, newTokenV7)
    address constant TAX_IMPL = 0x024f18294970B5c76c0691b87f138A0317156422; // Flap Tax Token V3 impl (7777)
    address constant NVDAB = 0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436; // bStocks NVIDIA
    address constant AAPLB = 0x431a3BEE82E2ca41e49895CbECE5bB0F76A89b7A; // bStocks Apple
    address constant USDT = 0x55d398326f99059fF775485246999027B3197955; // Flap-enabled, NOT a stock
    address constant XAUT = 0x21cAef8A43163Eea865baeE23b9C2E327696A3bf; // Flap RWA (gold), NOT a stock
    address constant NVDAB_WHALE = 0x25EE4Fa4BFf5363d47496e68377B1241E8E21a47; // BINF/NVDAB PancakeV2 pair
    // Real Agent ID holder (handle "mamu908" -> mamu908.ai), minted at block 129242862.
    address constant AGENT = 0x86618B6B44E5459b5D1e9cce05Ba0dadBe7215D4;

    uint256 constant FORK_BLOCK = 129244390;

    AgentLaunchpad pad;
    address owner = makeAddr("owner");
    address human = makeAddr("human-no-agent-id");

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("bsc"), FORK_BLOCK);
        pad = new AgentLaunchpad(PORTAL, AGENT_ID, owner, StockQuotes.all());
        _fundNvdab(AGENT, 5 ether);
        _fundNvdab(human, 5 ether);
    }

    function _fundNvdab(address to, uint256 amt) internal {
        vm.prank(NVDAB_WHALE);
        IERC20(NVDAB).transfer(to, amt);
    }

    // CREATE2 vanity search exactly like Flap's salt-finding reference (deployer = Portal, EIP-1167 clone).
    function _findSalt(address impl, uint16 suffix, bytes32 seed) internal pure returns (bytes32 salt, address predicted) {
        bytes32 initHash = keccak256(
            abi.encodePacked(hex"3d602d80600a3d3981f3363d3d373d3d3d363d73", impl, hex"5af43d82803e903d91602b57fd5bf3")
        );
        salt = keccak256(abi.encode(seed));
        address portal = PORTAL;
        assembly ("memory-safe") {
            let ptr := mload(0x40)
            mstore8(ptr, 0xff)
            mstore(add(ptr, 0x01), shl(96, portal))
            mstore(add(ptr, 0x35), initHash)
            for {} 1 {} {
                mstore(add(ptr, 0x15), salt)
                predicted := and(keccak256(ptr, 0x55), 0xffffffffffffffffffffffffffffffffffffffff)
                if eq(and(predicted, 0xffff), suffix) { break }
                mstore(0x00, salt)
                salt := keccak256(0x00, 0x20)
            }
        }
    }

    function _stdParams(address quote, uint256 amt, bytes32 salt) internal pure returns (AgentLaunchpad.LaunchParams memory p) {
        p.name = "Agent Test";
        p.symbol = "AGT";
        p.meta = "bafkreic5dsc73iujitnjsicsel7r65ks6oaww3pa75h3bp5ns2samxbh5u";
        p.salt = salt;
        p.quoteToken = quote;
        p.quoteAmt = amt;
        p.tokenVersion = 7;
        p.dexThresh = 1;
        p.antiFarmerDuration = 30 days;
        p.minimumShareBalance = 10_000 ether;
    }

    // ------------------------------------------------------------ sanity

    function test_RegistryAndHolderAreReal() public view {
        assertEq(IAgentIdRegistry(AGENT_ID).balanceOf(AGENT), 1);
        assertEq(IAgentIdRegistry(AGENT_ID).handleOf(AGENT), "mamu908");
        assertEq(IAgentIdRegistry(AGENT_ID).ownerOfHandle("mamu908"), AGENT);
        assertEq(AGENT.code.length, 0); // Binance Agentic Wallet = EOA
        assertTrue(pad.isAgent(AGENT));
        assertFalse(pad.isAgent(human));
        assertEq(pad.stockQuotes().length, 35);
        assertTrue(pad.isStockQuote(NVDAB));
        console2.log("Flap Portal version:", IFlapPortal(PORTAL).version());
    }

    // ------------------------------------------------------- required #1

    function test_RevertWhen_NonAgentLaunches() public {
        (bytes32 salt,) = _findSalt(STD_IMPL, 0x8888, "human");
        vm.startPrank(human, human);
        IERC20(NVDAB).approve(address(pad), 1 ether);
        vm.expectRevert(abi.encodeWithSelector(AgentLaunchpad.NotAgent.selector, human));
        pad.launch(_stdParams(NVDAB, 1 ether, salt));
        vm.stopPrank();
    }

    // ------------------------------------------------------- required #2

    function test_AgentLaunchesStandardTokenPairedWithNVDAB() public {
        (bytes32 salt, address predicted) = _findSalt(STD_IMPL, 0x8888, "agent-std");
        uint256 nvdaBefore = IERC20(NVDAB).balanceOf(AGENT);

        // Exactly the two txs an agent sends with `baw contract-call`: approve, then launch.
        vm.startPrank(AGENT, AGENT);
        IERC20(NVDAB).approve(address(pad), 1 ether);
        address token = pad.launch(_stdParams(NVDAB, 1 ether, salt));
        vm.stopPrank();

        assertEq(token, predicted, "vanity address");
        assertEq(uint16(uint160(token)), 0x8888);
        IFlapPortal.TokenStateV8Safe memory st = IFlapPortal(PORTAL).getTokenV8Safe(token);
        assertEq(st.quoteTokenAddress, NVDAB, "paired with NVDAB on Flap");
        assertEq(st.tokenVersion, 7);
        assertEq(IERC20(NVDAB).balanceOf(AGENT), nvdaBefore - 1 ether, "spent exactly quoteAmt");

        uint256 got = IERC20(token).balanceOf(AGENT);
        assertGt(got, 0, "dev buy forwarded to agent");
        assertEq(IERC20(token).balanceOf(address(pad)), 0, "wrapper holds no tokens");
        assertEq(IERC20(NVDAB).balanceOf(address(pad)), 0, "wrapper holds no quote");
        assertEq(IERC20(NVDAB).allowance(address(pad), PORTAL), 0, "allowance reset");

        assertEq(pad.launchesCount(), 1);
        AgentLaunchpad.Launch memory l = pad.getLaunch(0);
        assertEq(l.token, token);
        assertEq(l.creator, AGENT);
        assertEq(l.quoteToken, NVDAB);
        assertEq(l.agentHandle, "mamu908");
        assertEq(l.devBuyTokens, got);
        assertEq(pad.launchIndexPlusOne(token), 1);
        console2.log("std token", token, "dev-buy tokens", got);
    }

    function test_AgentLaunchesTaxTokenPairedWithNVDAB() public {
        (bytes32 salt, address predicted) = _findSalt(TAX_IMPL, 0x7777, "agent-tax");
        AgentLaunchpad.LaunchParams memory p = _stdParams(NVDAB, 1 ether, salt);
        p.tokenVersion = 6;
        p.buyTaxRate = 300;
        p.sellTaxRate = 300;
        p.taxDuration = 365 days;
        p.antiFarmerDuration = 3 days;
        p.minimumShareBalance = 0;
        p.mktBps = 10000;
        vm.startPrank(AGENT, AGENT);
        IERC20(NVDAB).approve(address(pad), 1 ether);
        address token = pad.launch(p);
        vm.stopPrank();
        assertEq(token, predicted);
        assertEq(uint16(uint160(token)), 0x7777);
        IFlapPortal.TokenStateV8Safe memory st = IFlapPortal(PORTAL).getTokenV8Safe(token);
        assertEq(st.quoteTokenAddress, NVDAB);
        assertEq(st.tokenVersion, 6);
        assertEq(st.buyTaxRate, 300);
        assertGt(IERC20(token).balanceOf(AGENT), 0);
        assertEq(IERC20(token).balanceOf(address(pad)), 0);
    }

    function test_AgentLaunchesWithoutDevBuy() public {
        (bytes32 salt,) = _findSalt(STD_IMPL, 0x8888, "agent-nobuy");
        vm.prank(AGENT, AGENT);
        address token = pad.launch(_stdParams(AAPLB, 0, salt));
        assertEq(IFlapPortal(PORTAL).getTokenV8Safe(token).quoteTokenAddress, AAPLB);
        assertEq(IERC20(token).balanceOf(AGENT), 0);
    }

    // ------------------------------------------------------- required #3

    function test_RevertWhen_QuoteNotAllowlisted_USDT() public {
        (bytes32 salt,) = _findSalt(STD_IMPL, 0x8888, "usdt");
        vm.prank(AGENT, AGENT);
        vm.expectRevert(abi.encodeWithSelector(AgentLaunchpad.QuoteNotAllowed.selector, USDT));
        pad.launch(_stdParams(USDT, 0, salt));
    }

    function test_RevertWhen_QuoteNotAllowlisted_NativeBNB() public {
        (bytes32 salt,) = _findSalt(STD_IMPL, 0x8888, "bnb");
        vm.deal(AGENT, 1 ether);
        vm.prank(AGENT, AGENT);
        vm.expectRevert(abi.encodeWithSelector(AgentLaunchpad.QuoteNotAllowed.selector, address(0)));
        pad.launch{value: 0.1 ether}(_stdParams(address(0), 0.1 ether, salt));
    }

    function test_RevertWhen_QuoteRemovedFromAllowlist() public {
        vm.prank(owner);
        pad.setStockQuote(NVDAB, false);
        (bytes32 salt,) = _findSalt(STD_IMPL, 0x8888, "removed");
        vm.startPrank(AGENT, AGENT);
        IERC20(NVDAB).approve(address(pad), 1 ether);
        vm.expectRevert(abi.encodeWithSelector(AgentLaunchpad.QuoteNotAllowed.selector, NVDAB));
        pad.launch(_stdParams(NVDAB, 1 ether, salt));
        vm.stopPrank();
    }

    // ------------------------------------------------------------ admin

    function test_OnlyOwnerManagesAllowlist() public {
        vm.prank(AGENT);
        vm.expectRevert();
        pad.setStockQuote(XAUT, true);
        // Owner can add only tokens Flap actually enables as quote.
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(AgentLaunchpad.QuoteNotEnabledOnFlap.selector, address(0xBEEF)));
        pad.setStockQuote(address(0xBEEF), true);
    }

    function test_RevertWhen_Paused() public {
        vm.prank(owner);
        pad.setPaused(true);
        (bytes32 salt,) = _findSalt(STD_IMPL, 0x8888, "paused");
        vm.prank(AGENT, AGENT);
        vm.expectRevert(AgentLaunchpad.IsPaused.selector);
        pad.launch(_stdParams(NVDAB, 0, salt));
    }
}
