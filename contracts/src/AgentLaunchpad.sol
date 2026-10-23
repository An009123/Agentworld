// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IFlapPortal} from "./interfaces/IFlapPortal.sol";
import {IAgentIdRegistry} from "./interfaces/IAgentIdRegistry.sol";

/// @title AgentLaunchpad
/// @notice Agent-only token launchpad on top of Flap.sh (BNB Chain).
///         (A) msg.sender must hold a SPACE ID / Binance `.ai` Agent ID (soulbound) at launch time.
///         (B) the quote token must be an owner-allowlisted tokenized stock (bStocks / xStocks / Ondo ...),
///             which in turn must be an enabled quote token on the Flap Portal.
///         The wrapper pulls the agent's quote tokens (approve -> transferFrom), approves the Portal,
///         calls Portal.newTokenV6, forwards dev-buy tokens and any leftovers back to the agent and
///         records the launch.
contract AgentLaunchpad is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// Non-tax token, launched via Portal.newTokenV7 (impl 0x88881b6f..63333, vanity suffix 8888).
    /// (TOKEN_V2_PERMIT via newTokenV6 reverts FeatureDisabled() on Portal v5.26.0.)
    uint8 public constant TOKEN_V3_PERMIT = 7;
    /// Tax token, launched via Portal.newTokenV6 (impl 0x024f1829..56422, vanity suffix 7777).
    uint8 public constant TOKEN_TAXED_V3 = 6;
    uint8 public constant PCS_INFINITY_CL_MIGRATOR = 3;
    uint8 public constant V2_MIGRATOR = 1;
    address public constant MAGIC_DIVIDEND_SELF = 0xfEEDFEEDfeEDFEedFEEdFEEDFeEdfEEdFeEdFEEd;

    IFlapPortal public immutable portal;
    IAgentIdRegistry public immutable agentIdRegistry;

    struct LaunchParams {
        string name;
        string symbol;
        string meta; // IPFS CID of Flap-format metadata JSON
        bytes32 salt; // vanity salt (CREATE2 deployer = Portal)
        address quoteToken; // must be allowlisted stock
        uint256 quoteAmt; // dev buy in quote-token base units (0 = no dev buy)
        uint8 tokenVersion; // 7 (standard, V7) or 6 (tax, V6)
        uint8 dexThresh; // Flap DexThreshType (1 = FOUR_FIFTHS)
        uint16 buyTaxRate; // bps, tax token only (version 7 uses only antiFarmerDuration + minimumShareBalance)
        uint16 sellTaxRate;
        uint64 taxDuration;
        uint64 antiFarmerDuration;
        uint16 mktBps;
        uint16 deflationBps;
        uint16 dividendBps;
        uint16 lpBps;
        uint256 minimumShareBalance;
        address dividendToken;
    }

    struct Launch {
        address token;
        address creator; // agent wallet
        address quoteToken;
        uint64 timestamp;
        uint8 tokenVersion;
        uint256 quoteAmt;
        uint256 devBuyTokens;
        string agentHandle; // without ".ai"
    }

    Launch[] private _launches;
    mapping(address => uint256[]) private _byCreator;
    mapping(address => uint256) public launchIndexPlusOne; // token => index + 1

    mapping(address => bool) public isStockQuote;
    address[] private _stockQuotes;
    bool public paused;

    event AgentTokenLaunched(
        uint256 indexed index,
        address indexed token,
        address indexed creator,
        address quoteToken,
        string agentHandle,
        string name,
        string symbol,
        string meta,
        uint256 quoteAmt,
        uint256 devBuyTokens,
        uint8 tokenVersion
    );
    event StockQuoteSet(address indexed quoteToken, bool allowed);
    event Paused(bool paused);

    error NotAgent(address caller);
    error QuoteNotAllowed(address quoteToken);
    error QuoteNotEnabledOnFlap(address quoteToken);
    error UnsupportedTokenVersion(uint8 tokenVersion);
    error IsPaused();
    error BadQuoteTransfer(uint256 expected, uint256 received);
    error ZeroAddress();
    error BadDividendToken(address dividendToken);

    constructor(address portal_, address agentIdRegistry_, address owner_, address[] memory initialStocks)
        Ownable(owner_)
    {
        if (portal_ == address(0) || agentIdRegistry_ == address(0)) revert ZeroAddress();
        portal = IFlapPortal(portal_);
        agentIdRegistry = IAgentIdRegistry(agentIdRegistry_);
        for (uint256 i; i < initialStocks.length; ++i) {
            _setStockQuote(initialStocks[i], true);
        }
    }

    // ------------------------------------------------------------------ views

    /// @notice True iff `account` holds a `.ai` Agent ID right now.
    function isAgent(address account) public view returns (bool) {
        return agentIdRegistry.balanceOf(account) > 0;
    }

    function agentHandleOf(address account) external view returns (string memory) {
        return agentIdRegistry.handleOf(account);
    }

    function stockQuotes() external view returns (address[] memory) {
        return _stockQuotes;
    }

    function launchesCount() external view returns (uint256) {
        return _launches.length;
    }

    function getLaunch(uint256 index) external view returns (Launch memory) {
        return _launches[index];
    }

    /// @notice Paginated list, newest first when `newestFirst` is true.
    function getLaunches(uint256 offset, uint256 limit, bool newestFirst) external view returns (Launch[] memory out) {
        uint256 n = _launches.length;
        if (offset >= n) return new Launch[](0);
        uint256 m = n - offset < limit ? n - offset : limit;
        out = new Launch[](m);
        for (uint256 i; i < m; ++i) {
            out[i] = _launches[newestFirst ? n - 1 - offset - i : offset + i];
        }
    }

    function launchesByCreator(address creator) external view returns (uint256[] memory) {
        return _byCreator[creator];
    }

    // ----------------------------------------------------------------- launch

    /// @notice Launch a Flap token paired with an allowlisted tokenized stock.
    /// @dev    Caller must (1) hold a .ai Agent ID and (2) have approved `p.quoteAmt` of `p.quoteToken`
    ///         to THIS contract (not to the Portal). msg.value is forwarded unchanged to the Portal
    ///         (normally 0 for ERC-20 quotes).
    function launch(LaunchParams calldata p) external payable nonReentrant returns (address token) {
        if (paused) revert IsPaused();
        if (!isAgent(msg.sender)) revert NotAgent(msg.sender);
        if (!isStockQuote[p.quoteToken]) revert QuoteNotAllowed(p.quoteToken);
        if (p.tokenVersion != TOKEN_V3_PERMIT && p.tokenVersion != TOKEN_TAXED_V3) {
            revert UnsupportedTokenVersion(p.tokenVersion);
        }

        IERC20 quote = IERC20(p.quoteToken);
        if (p.quoteAmt > 0) {
            uint256 before = quote.balanceOf(address(this));
            quote.safeTransferFrom(msg.sender, address(this), p.quoteAmt);
            uint256 received = quote.balanceOf(address(this)) - before;
            if (received != p.quoteAmt) revert BadQuoteTransfer(p.quoteAmt, received);
            quote.forceApprove(address(portal), p.quoteAmt);
        }

        token = p.tokenVersion == TOKEN_TAXED_V3 ? _launchTax(p) : _launchStandard(p);

        // Dev-buy tokens are minted to the caller of the Portal (this contract): forward them.
        uint256 devBuy = IERC20(token).balanceOf(address(this));
        if (devBuy > 0) IERC20(token).safeTransfer(msg.sender, devBuy);

        // Clean up: reset allowance, refund any unspent quote and native dust.
        if (p.quoteAmt > 0) {
            quote.forceApprove(address(portal), 0);
            uint256 leftover = quote.balanceOf(address(this));
            if (leftover > 0) quote.safeTransfer(msg.sender, leftover);
        }
        if (address(this).balance > 0) {
            (bool ok,) = msg.sender.call{value: address(this).balance}("");
            ok; // best effort; never block a launch on dust refund
        }

        string memory handle = agentIdRegistry.handleOf(msg.sender);
        uint256 index = _launches.length;
        _launches.push(
            Launch({
                token: token,
                creator: msg.sender,
                quoteToken: p.quoteToken,
                timestamp: uint64(block.timestamp),
                tokenVersion: p.tokenVersion,
                quoteAmt: p.quoteAmt,
                devBuyTokens: devBuy,
                agentHandle: handle
            })
        );
        _byCreator[msg.sender].push(index);
        launchIndexPlusOne[token] = index + 1;

        emit AgentTokenLaunched(
            index, token, msg.sender, p.quoteToken, handle, p.name, p.symbol, p.meta, p.quoteAmt, devBuy, p.tokenVersion
        );
    }

    function _launchStandard(LaunchParams calldata p) internal returns (address) {
        IFlapPortal.NewTokenV7Params memory fp;
        fp.name = p.name;
        fp.symbol = p.symbol;
        fp.meta = p.meta;
        fp.dexThresh = p.dexThresh;
        fp.salt = p.salt;
        fp.migratorType = PCS_INFINITY_CL_MIGRATOR;
        fp.quoteToken = p.quoteToken;
        fp.quoteAmt = p.quoteAmt;
        fp.antiFarmerDuration = p.antiFarmerDuration;
        fp.tokenVersion = TOKEN_V3_PERMIT;
        // Portal v5.26.0 accepts only the DIVIDEND fee mode on the public TOKEN_V3_PERMIT path
        // (a MARKETING_OR_VAULT slot reverts NewTokenV7RuleViolation(8) — verified on a BSC fork).
        // LP fees are therefore distributed to holders in the stock quote token itself.
        fp.feeConfigs[0] = IFlapPortal.FeeConfig({
            feeType: 2,
            bps: 10000,
            marketingAddress: address(0),
            dividendToken: p.quoteToken,
            minimumShareBalance: p.minimumShareBalance
        });
        return portal.newTokenV7{value: msg.value}(fp);
    }

    function _launchTax(LaunchParams calldata p) internal returns (address) {
        // Flap: with a non-native quote, dividendToken must be the quote token or MAGIC_DIVIDEND_SELF.
        address div = p.dividendToken == address(0) ? p.quoteToken : p.dividendToken;
        if (div != p.quoteToken && div != MAGIC_DIVIDEND_SELF) revert BadDividendToken(div);
        IFlapPortal.NewTokenV6Params memory fp = IFlapPortal.NewTokenV6Params({
            name: p.name,
            symbol: p.symbol,
            meta: p.meta,
            dexThresh: p.dexThresh,
            salt: p.salt,
            migratorType: V2_MIGRATOR,
            quoteToken: p.quoteToken,
            quoteAmt: p.quoteAmt,
            beneficiary: msg.sender, // tax revenue always goes to the agent
            permitData: "",
            extensionID: bytes32(0),
            extensionData: "",
            dexId: 0,
            lpFeeProfile: 0,
            buyTaxRate: p.buyTaxRate,
            sellTaxRate: p.sellTaxRate,
            taxDuration: p.taxDuration,
            antiFarmerDuration: p.antiFarmerDuration,
            mktBps: p.mktBps,
            deflationBps: p.deflationBps,
            dividendBps: p.dividendBps,
            lpBps: p.lpBps,
            minimumShareBalance: p.minimumShareBalance,
            dividendToken: div,
            commissionReceiver: address(0),
            tokenVersion: TOKEN_TAXED_V3
        });
        return portal.newTokenV6{value: msg.value}(fp);
    }

    // ------------------------------------------------------------------ admin

    function setStockQuote(address quoteToken, bool allowed) external onlyOwner {
        _setStockQuote(quoteToken, allowed);
    }

    function setPaused(bool p) external onlyOwner {
        paused = p;
        emit Paused(p);
    }

    /// @notice Rescue tokens accidentally sent here (the contract holds no balances between txs).
    function rescue(address token, address to, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            (bool ok,) = to.call{value: amount}("");
            require(ok, "native rescue failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    function _setStockQuote(address quoteToken, bool allowed) internal {
        if (quoteToken == address(0)) revert ZeroAddress();
        if (allowed) {
            if (portal.getQuoteTokenConfiguration(quoteToken).enabled != 1) revert QuoteNotEnabledOnFlap(quoteToken);
            if (!isStockQuote[quoteToken]) _stockQuotes.push(quoteToken);
        } else if (isStockQuote[quoteToken]) {
            uint256 n = _stockQuotes.length;
            for (uint256 i; i < n; ++i) {
                if (_stockQuotes[i] == quoteToken) {
                    _stockQuotes[i] = _stockQuotes[n - 1];
                    _stockQuotes.pop();
                    break;
                }
            }
        }
        isStockQuote[quoteToken] = allowed;
        emit StockQuoteSet(quoteToken, allowed);
    }

    receive() external payable {}
}
