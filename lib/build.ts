// Builds the two transactions an agent sends with Binance Agentic Wallet (baw):
//   1) quote.approve(launchpad, quoteAmt)   (skipped when quoteAmt == 0 or allowance suffices)
//   2) launchpad.launch(params)             (value 0 – stock quotes are ERC20)
import { encodeFunctionData, parseUnits, getAddress, zeroAddress, type Address, type Hex } from 'viem';
import { erc20Abi, launchpadAbi } from './abi';
import { CHAIN_ID, STOCKS, TOKEN_VERSION, stockBySymbolOrAddress } from './config';

export type BuildInput = {
  launchpad: string; agent: string; name: string; symbol: string; meta: string; salt: Hex;
  quote: string; devBuy?: string; // human units of the stock token, e.g. "1.5"
  type?: 'standard' | 'tax';
  buyTaxBps?: number; sellTaxBps?: number; taxDurationDays?: number; antiFarmerDays?: number;
  mktBps?: number; deflationBps?: number; dividendBps?: number; lpBps?: number;
  minimumShareBalance?: string; // whole tokens
  currentAllowance?: bigint;
};

const q = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

export function bawCommands(from: string, to: string, data: Hex, value = '0', gasLimit?: number) {
  const g = gasLimit ? ` --gasLimit ${gasLimit}` : '';
  return {
    preview: `baw contract-call preview --binanceChainId ${CHAIN_ID} --from ${from} --to ${to} --value ${value} --inputData ${data}${g} --json`,
    execute: `baw contract-call execute --requestId <requestId from preview> --json`,
  };
}

export function buildLaunch(i: BuildInput) {
  const stock = stockBySymbolOrAddress(i.quote);
  if (!stock) throw new Error(`quote ${i.quote} is not an allowlisted stock token. Allowed: ${STOCKS.map((s) => s.symbol).join(', ')}`);
  const type = i.type || 'standard';
  if (!i.name || !i.symbol) throw new Error('name and symbol required');
  if (!i.meta) throw new Error('meta CID required (run upload first)');
  if (!/^0x[0-9a-fA-F]{64}$/.test(i.salt)) throw new Error('salt must be bytes32 (run salt first)');
  const launchpad = getAddress(i.launchpad), agent = getAddress(i.agent);
  const quoteAmt = parseUnits(i.devBuy || '0', stock.decimals);
  const day = 86400n;
  const tax = type === 'tax';
  const buy = i.buyTaxBps ?? 300, sell = i.sellTaxBps ?? buy;
  const shares = { mkt: i.mktBps ?? (tax ? 10000 : 0), defl: i.deflationBps ?? 0, div: i.dividendBps ?? 0, lp: i.lpBps ?? 0 };
  if (tax && shares.mkt + shares.defl + shares.div + shares.lp !== 10000) throw new Error('tax shares (mkt+deflation+dividend+lp) must sum to 10000 bps');
  const params = {
    name: i.name, symbol: i.symbol, meta: i.meta, salt: i.salt,
    quoteToken: stock.address as Address, quoteAmt,
    tokenVersion: tax ? TOKEN_VERSION.tax : TOKEN_VERSION.standard,
    dexThresh: 1,
    buyTaxRate: tax ? buy : 0, sellTaxRate: tax ? sell : 0,
    taxDuration: tax ? BigInt(i.taxDurationDays ?? 365) * day : 0n,
    antiFarmerDuration: BigInt(i.antiFarmerDays ?? (tax ? 3 : 30)) * day,
    mktBps: tax ? shares.mkt : 0, deflationBps: tax ? shares.defl : 0, dividendBps: tax ? shares.div : 0, lpBps: tax ? shares.lp : 0,
    minimumShareBalance: parseUnits(i.minimumShareBalance ?? (tax ? '0' : '10000'), 18),
    dividendToken: zeroAddress as Address, // wrapper defaults to the stock quote
  };
  const launchData = encodeFunctionData({ abi: launchpadAbi, functionName: 'launch', args: [params] });
  const needApprove = quoteAmt > 0n && (i.currentAllowance ?? 0n) < quoteAmt;
  const approveData = needApprove ? encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [launchpad, quoteAmt] }) : null;
  const txs = [
    ...(approveData ? [{ step: 'approve', description: `approve ${i.devBuy} ${stock.symbol} to AgentLaunchpad`, from: agent, to: stock.address, value: '0', data: approveData, baw: bawCommands(agent, stock.address, approveData), gasMeasuredOnFork: '~55k' }] : []),
    { step: 'launch', description: `launch ${i.symbol} paired with ${stock.symbol} (${type})`, from: agent, to: launchpad, value: '0', data: launchData, baw: bawCommands(agent, launchpad, launchData, '0'), gasMeasuredOnFork: tax ? '~6.3M' : '~2.5M-3.0M' },
  ];
  return { chainId: CHAIN_ID, stock, type, params: { ...params, quoteAmt: quoteAmt.toString(), taxDuration: params.taxDuration.toString(), antiFarmerDuration: params.antiFarmerDuration.toString(), minimumShareBalance: params.minimumShareBalance.toString() }, txs };
}
export { q as shellQuote };
