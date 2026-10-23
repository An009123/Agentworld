export const launchParamsComponents = [
  { name: 'name', type: 'string' },
  { name: 'symbol', type: 'string' },
  { name: 'meta', type: 'string' },
  { name: 'salt', type: 'bytes32' },
  { name: 'quoteToken', type: 'address' },
  { name: 'quoteAmt', type: 'uint256' },
  { name: 'tokenVersion', type: 'uint8' },
  { name: 'dexThresh', type: 'uint8' },
  { name: 'buyTaxRate', type: 'uint16' },
  { name: 'sellTaxRate', type: 'uint16' },
  { name: 'taxDuration', type: 'uint64' },
  { name: 'antiFarmerDuration', type: 'uint64' },
  { name: 'mktBps', type: 'uint16' },
  { name: 'deflationBps', type: 'uint16' },
  { name: 'dividendBps', type: 'uint16' },
  { name: 'lpBps', type: 'uint16' },
  { name: 'minimumShareBalance', type: 'uint256' },
  { name: 'dividendToken', type: 'address' },
] as const;

const launchTuple = [
  { name: 'token', type: 'address' },
  { name: 'creator', type: 'address' },
  { name: 'quoteToken', type: 'address' },
  { name: 'timestamp', type: 'uint64' },
  { name: 'tokenVersion', type: 'uint8' },
  { name: 'quoteAmt', type: 'uint256' },
  { name: 'devBuyTokens', type: 'uint256' },
  { name: 'agentHandle', type: 'string' },
] as const;

export const launchpadAbi = [
  { type: 'function', name: 'launch', stateMutability: 'payable', inputs: [{ name: 'p', type: 'tuple', components: launchParamsComponents }], outputs: [{ name: 'token', type: 'address' }] },
  { type: 'function', name: 'isAgent', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'isStockQuote', stateMutability: 'view', inputs: [{ name: 'q', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'stockQuotes', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
  { type: 'function', name: 'paused', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'launchesCount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getLaunches', stateMutability: 'view', inputs: [{ name: 'offset', type: 'uint256' }, { name: 'limit', type: 'uint256' }, { name: 'newestFirst', type: 'bool' }], outputs: [{ type: 'tuple[]', components: launchTuple }] },
  {
    type: 'event', name: 'AgentTokenLaunched', inputs: [
      { name: 'index', type: 'uint256', indexed: true }, { name: 'token', type: 'address', indexed: true }, { name: 'creator', type: 'address', indexed: true },
      { name: 'quoteToken', type: 'address', indexed: false }, { name: 'agentHandle', type: 'string', indexed: false }, { name: 'name', type: 'string', indexed: false },
      { name: 'symbol', type: 'string', indexed: false }, { name: 'meta', type: 'string', indexed: false }, { name: 'quoteAmt', type: 'uint256', indexed: false },
      { name: 'devBuyTokens', type: 'uint256', indexed: false }, { name: 'tokenVersion', type: 'uint8', indexed: false },
    ],
  },
  { type: 'error', name: 'NotAgent', inputs: [{ name: 'caller', type: 'address' }] },
  { type: 'error', name: 'QuoteNotAllowed', inputs: [{ name: 'quoteToken', type: 'address' }] },
  { type: 'error', name: 'UnsupportedTokenVersion', inputs: [{ name: 'tokenVersion', type: 'uint8' }] },
  { type: 'error', name: 'IsPaused', inputs: [] },
  { type: 'error', name: 'BadQuoteTransfer', inputs: [{ name: 'expected', type: 'uint256' }, { name: 'received', type: 'uint256' }] },
  { type: 'error', name: 'BadDividendToken', inputs: [{ name: 'dividendToken', type: 'address' }] },
] as const;

export const agentIdAbi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'handleOf', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'ownerOfHandle', stateMutability: 'view', inputs: [{ name: 'h', type: 'string' }], outputs: [{ type: 'address' }] },
] as const;

export const erc20Abi = [
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 's', type: 'address' }, { name: 'a', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }, { name: 's', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'metaURI', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
] as const;

export const portalAbi = [
  {
    type: 'function', name: 'getTokenV8Safe', stateMutability: 'view', inputs: [{ name: 'token', type: 'address' }], outputs: [{
      type: 'tuple', components: [
        { name: 'status', type: 'uint8' }, { name: 'reserve', type: 'uint256' }, { name: 'circulatingSupply', type: 'uint256' }, { name: 'price', type: 'uint256' },
        { name: 'tokenVersion', type: 'uint8' }, { name: 'r', type: 'uint256' }, { name: 'h', type: 'uint256' }, { name: 'k', type: 'uint256' },
        { name: 'dexSupplyThresh', type: 'uint256' }, { name: 'quoteTokenAddress', type: 'address' }, { name: 'nativeToQuoteSwapEnabled', type: 'bool' },
        { name: 'extensionID', type: 'bytes32' }, { name: 'buyTaxRate', type: 'uint256' }, { name: 'sellTaxRate', type: 'uint256' }, { name: 'pool', type: 'address' },
        { name: 'progress', type: 'uint256' }, { name: 'lpFeeProfile', type: 'uint8' }, { name: 'dexId', type: 'uint8' },
      ],
    }],
  },
] as const;
