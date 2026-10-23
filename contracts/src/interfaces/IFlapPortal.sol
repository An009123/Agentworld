// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal subset of Flap's Portal (BSC 0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0),
///         copied from Flap's published IPortal interface (docs.flap.sh). Enums are ABI-encoded
///         as uint8, so they are declared as uint8 here.
interface IFlapPortal {
    struct NewTokenV6Params {
        string name;
        string symbol;
        string meta;
        uint8 dexThresh; // DexThreshType
        bytes32 salt;
        uint8 migratorType; // MigratorType: 0=V3, 1=V2_MIGRATOR
        address quoteToken;
        uint256 quoteAmt;
        address beneficiary;
        bytes permitData;
        bytes32 extensionID;
        bytes extensionData;
        uint8 dexId; // DEXId
        uint8 lpFeeProfile; // V3LPFeeProfile
        uint16 buyTaxRate;
        uint16 sellTaxRate;
        uint64 taxDuration;
        uint64 antiFarmerDuration;
        uint16 mktBps;
        uint16 deflationBps;
        uint16 dividendBps;
        uint16 lpBps;
        uint256 minimumShareBalance;
        address dividendToken;
        address commissionReceiver;
        uint8 tokenVersion; // TokenVersion: 2=TOKEN_V2_PERMIT, 6=TOKEN_TAXED_V3
    }

    /// FeeType: 0=NONE, 1=MARKETING_OR_VAULT, 2=DIVIDEND, 3=DEFLATION, 4=LP_BPS
    struct FeeConfig {
        uint8 feeType;
        uint16 bps;
        address marketingAddress;
        address dividendToken;
        uint256 minimumShareBalance;
    }

    struct NewTokenV7Params {
        string name;
        string symbol;
        string meta;
        uint8 dexThresh;
        bytes32 salt;
        uint8 migratorType; // must be 3 = PCS_INFINITY_CL_MIGRATOR for TOKEN_V3_PERMIT
        address quoteToken;
        uint256 quoteAmt;
        bytes permitData;
        bytes32 extensionID;
        bytes extensionData;
        uint8 dexId;
        uint16 buyTaxRate;
        uint16 sellTaxRate;
        uint64 taxDuration;
        uint64 antiFarmerDuration;
        address commissionReceiver;
        uint8 tokenVersion; // 7 = TOKEN_V3_PERMIT
        FeeConfig[4] feeConfigs;
    }

    struct QuoteTokenConfiguration {
        uint8 enabled;
        uint8 defaultCurve;
        uint8 alternativeCurve;
        uint8 nativeToQuoteSwapType;
        uint8 dexId;
    }

    struct TokenStateV8Safe {
        uint8 status;
        uint256 reserve;
        uint256 circulatingSupply;
        uint256 price;
        uint8 tokenVersion;
        uint256 r;
        uint256 h;
        uint256 k;
        uint256 dexSupplyThresh;
        address quoteTokenAddress;
        bool nativeToQuoteSwapEnabled;
        bytes32 extensionID;
        uint256 buyTaxRate;
        uint256 sellTaxRate;
        address pool;
        uint256 progress;
        uint8 lpFeeProfile;
        uint8 dexId;
    }

    event TokenCreated(uint256 ts, address creator, uint256 nonce, address token, string name, string symbol, string meta);

    function newTokenV6(NewTokenV6Params calldata params) external payable returns (address token);
    function newTokenV7(NewTokenV7Params calldata params) external payable returns (address token);
    function getQuoteTokenConfiguration(address quoteToken) external view returns (QuoteTokenConfiguration memory);
    function getTokenV8Safe(address token) external view returns (TokenStateV8Safe memory state);
    function version() external view returns (string memory);
}
