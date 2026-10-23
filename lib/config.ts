// All addresses verified on BSC mainnet (chainId 56). See README "Verified addresses".
import stocksJson from '../shared/stocks.json';

export const CHAIN_ID = 56;
export const FLAP = {
  portal: '0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0',
  vaultPortal: '0x90497450f2a706f1951b5bdda52B4E5d16f34C06',
  standardTokenV3Impl: '0x88881b6f03090462a969eC7f48385744Eeb63333', // newTokenV7 TOKEN_V3_PERMIT, suffix 8888
  taxTokenV3Impl: '0x024f18294970B5c76c0691b87f138A0317156422', // newTokenV6 TOKEN_TAXED_V3, suffix 7777
  taxTokenHelper: '0x53841c73217735F37BC1775538b03b23feFD8346',
} as const;
/** SPACE ID "Agent ID" (.ai) soulbound registry used by Binance Agentic Wallet. */
export const AGENT_ID_REGISTRY = '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F' as const;

export type Stock = { symbol: string; address: `0x${string}`; name: string; decimals: number; issuer: string };
export const STOCKS: Stock[] = (stocksJson as { stocks: Stock[] }).stocks;
export const STOCK_SOURCE: string = (stocksJson as { source: string }).source;
export const stockBySymbolOrAddress = (q: string) =>
  STOCKS.find((s) => s.symbol.toLowerCase() === q.toLowerCase() || s.address.toLowerCase() === q.toLowerCase());

export const TOKEN_VERSION = { standard: 7, tax: 6 } as const;
export const SUFFIX = { standard: '8888', tax: '7777' } as const;
export const implFor = (kind: 'standard' | 'tax') => (kind === 'tax' ? FLAP.taxTokenV3Impl : FLAP.standardTokenV3Impl);

export const env = {
  rpc: () => process.env.BSC_RPC_URL || process.env.NEXT_PUBLIC_CHAIN_RPC || 'https://bsc-rpc.publicnode.com',
  launchpad: () => (process.env.LAUNCHPAD_ADDRESS || process.env.NEXT_PUBLIC_LAUNCHPAD_ADDRESS || '') as `0x${string}` | '',
};
export const links = {
  bscscanToken: (a: string) => `https://bscscan.com/token/${a}`,
  bscscanAddress: (a: string) => `https://bscscan.com/address/${a}`,
  bscscanTx: (h: string) => `https://bscscan.com/tx/${h}`,
  flap: (a: string) => `https://flap.sh/bnb/${a}`,
  ipfs: (cid: string) => `https://flap.mypinata.cloud/ipfs/${cid}`,
};
