// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Tokenized-stock / ETF quote tokens that Flap's Portal accepts on BSC (chainId 56).
///         Source: https://flap.sh/api/launch/quote-tokens (category "rwa"), each re-verified on-chain:
///         symbol() matches and Portal.getQuoteTokenConfiguration(token).enabled == 1.
///         Non-equity RWA entries (pPOLY, xKLSH, XAUT) and the private-company token oANTHROPIC are excluded.
library StockQuotes {
    address internal constant NVDAB = 0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436;
    address internal constant AAPLB = 0x431a3BEE82E2ca41e49895CbECE5bB0F76A89b7A;
    address internal constant TSLAB = 0x5b1910eAaD6450E50f816082Aa078C41F10C292f;

    function all() internal pure returns (address[] memory a) {
        a = new address[](35);
        a[0] = 0xbe9D156892E55e7154BcD3cB0FEA677F9D3103E1; // SPCXB  SpaceX (bStocks)
        a[1] = 0xCA750eF65f295BBECd685Abf54e82CAf297BDB61; // SKHYB  SK Hynix
        a[2] = 0x7138b48df7D98D7e3cc221BfE7192D0a178182D8; // SPYB   SPY
        a[3] = 0x205812CdBed920aFf76C6580abD681a46D11efc7; // QQQB   Invesco QQQ
        a[4] = 0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436; // NVDAB  NVIDIA
        a[5] = 0x431a3BEE82E2ca41e49895CbECE5bB0F76A89b7A; // AAPLB  Apple
        a[6] = 0x5b1910eAaD6450E50f816082Aa078C41F10C292f; // TSLAB  Tesla
        a[7] = 0xBE82F76637DBA2C114C41Df856c2C51e522E2Cb8; // EWYB   iShares MSCI South Korea
        a[8] = 0xdd5126d49B4C1e075C5b4249e289F1A00Cc0A285; // wBANKCx Bank of China (xStock)
        a[9] = 0x076CF393E701839FC7a5832D2c68AaFA235682AE; // wXIAOx Xiaomi (xStock)
        a[10] = 0x41333Df9E7639188BBfca5522dC4844398Af9f9E; // wTCENTx Tencent (xStock)
        a[11] = 0x4Ebf5Fd25B02022AfaD96E2fA25dA54A246FDEd0; // wPOPMTx Pop Mart (xStock)
        a[12] = 0xa455ae0f04a2b86eee47adCA98985E61D14CbEfb; // AGPUB  Axe Compute
        a[13] = 0x0393c28065C54E48b45BDB05eFf5C401cF891DA1; // CYPHB  Cypherpunk Technologies
        a[14] = 0x96e7d606e229448eF817A7f35fd7394C3E15d00C; // AMCB   AMC Entertainment
        a[15] = 0x6458D4844ccaaD06dbf566D1df93D8815f89D9b0; // aWDH   Waterdrop Inc
        a[16] = 0x80106cb3EAD06659A5ad19DF39D9b4733863B9b0; // MSFTB  Microsoft
        a[17] = 0x3F53De71c126BdaBAe20f9cD64848d317f6C3238; // GOOGLB Alphabet
        a[18] = 0xA394dCEa3fd3847fD793afBFd163E2e3858B7c65; // HOODB  Robinhood
        a[19] = 0x4eF9d3062c7F6ebA4AAE4990c5036598C6eff4ec; // BABAB  Alibaba
        a[20] = 0x46cEeFDa28Dd7207059ed19B0acdc026955bb15C; // GMEB   GameStop
        a[21] = 0xD6829Ea836b6FA224d099D40E54B31262f874631; // NFLXB  Netflix
        a[22] = 0xE87afb3076AeB0f9B14E368DE8145ae6a2826A14; // MSTRB  Strategy
        a[23] = 0xF2ec508422174Ee564de98187db9359D318AFB6b; // DJTB   Trump Media & Technology
        a[24] = 0xE28Cd11C99AF2df76bb8aDA4Cd0ef3904378280F; // SOXSB  Direxion Semi Bear 3X
        a[25] = 0xd97d097a89113fa59b76c572E5b2Eb647E8eefaf; // SOXLB  Semi Bull 3X
        a[26] = 0x5fd86da9B05abE396fe9d02a4A213A7c00556503; // MRNAB  Moderna
        a[27] = 0x4af1D41cd9dD950dcA43984b43aaA2A8702714Ac; // FLNCB  Fluence Energy
        a[28] = 0x25e572B466D152604D9E6C3e53B432B978825342; // SQQQB  ProShares UltraPro Short QQQ
        a[29] = 0x4902C5ebc598265Ed2212b559B042De8a5Eeec3f; // BNCB   CEA Industries
        a[30] = 0x9b8E987e6fEc8Cf1380C4dcA7071e2C7853AEEA1; // FXIon  iShares China Large-Cap (Ondo)
        a[31] = 0x3548Da95a9eFFE481e8604664d75e95821e557F5; // BMNRB  BitMine Immersion
        a[32] = 0x91fc7371d6dE682A1e8CFcB4EB7dA693312A03a4; // BILIon Bilibili (Ondo)
        a[33] = 0xc008c5F579ec1450F20099c39F587547e27c7523; // SGOVon iShares 0-3M Treasury ETF (Ondo)
        a[34] = 0xf69e40069aC227C11459E3f4e8a446b3401616b6; // TLTon  iShares 20+Y Treasury ETF (Ondo)
    }
}
