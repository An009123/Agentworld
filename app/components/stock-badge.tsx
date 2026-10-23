const MARK: Record<string, string> = {
  NVDAB: 'NV',
  AAPLB: 'AA',
  TSLAB: 'TS',
  MSFTB: 'MS',
  GOOGLB: 'GO',
  NFLXB: 'NF',
  MSTRB: 'ST',
  HOODB: 'HO',
  GMEB: 'GM',
  QQQB: 'QQ',
  SPYB: 'SP',
  SPCXB: 'SX',
  SKHYB: 'SK',
  BABAB: 'AL',
  BILIon: 'BL',
  wTCENTx: 'TX',
  wXIAOx: 'MI',
  wBANKCx: 'BC',
  wPOPMTx: 'PM',
  SGOVon: 'SG',
  TLTon: 'TL',
  SQQQB: 'SQ',
  DJTB: 'DJ',
  AMZB: 'AM',
  AMCB: 'AC',
};

const TONE: Record<string, { fg: string; bg: string }> = {
  NVDAB: { fg: '#C6F54E', bg: '#17210F' },
  AAPLB: { fg: '#F4F4F5', bg: '#2A2A2E' },
  TSLAB: { fg: '#FF6B6B', bg: '#2C1518' },
  MSFTB: { fg: '#8EBEFF', bg: '#121E30' },
  GOOGLB: { fg: '#A9C7FF', bg: '#161E2E' },
  NFLXB: { fg: '#FF8A80', bg: '#2A1416' },
  QQQB: { fg: '#FCD535', bg: '#261E0A' },
  SPYB: { fg: '#F0B90B', bg: '#241C08' },
  SPCXB: { fg: '#EAECEF', bg: '#1C2026' },
  MSTRB: { fg: '#F0B90B', bg: '#2A220C' },
  HOODB: { fg: '#3DDC97', bg: '#10241C' },
  GMEB: { fg: '#FF5C5C', bg: '#2C1214' },
  BABAB: { fg: '#FFB020', bg: '#2A1C0C' },
  BILIon: { fg: '#7EB6FF', bg: '#142033' },
  wTCENTx: { fg: '#FCD535', bg: '#2A220C' },
  wXIAOx: { fg: '#FF9A3C', bg: '#2A1A0C' },
};

const FALLBACK = [
  { fg: '#F0B90B', bg: '#2A2208' },
  { fg: '#EAECEF', bg: '#22262C' },
  { fg: '#3DDC97', bg: '#10241C' },
  { fg: '#8EBEFF', bg: '#142033' },
  { fg: '#FCD535', bg: '#2A240C' },
];

function hash(symbol: string) {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  return h;
}

export function badgeMark(symbol: string) {
  if (MARK[symbol]) return MARK[symbol];
  const core = symbol.replace(/on$/i, '').replace(/x$/i, '').replace(/^w/i, '').replace(/B$/, '') || symbol;
  return core.slice(0, 2).toUpperCase();
}

export function badgeTone(symbol: string) {
  return TONE[symbol] || FALLBACK[hash(symbol) % FALLBACK.length];
}

export function StockBadge({ symbol, size = 28 }: { symbol: string; size?: number }) {
  const tone = badgeTone(symbol);
  const letters = badgeMark(symbol);
  const fontSize = Math.max(9, Math.round(size * (letters.length > 2 ? 0.34 : 0.4)));
  return (
    <span
      className="badge"
      style={{
        width: size,
        height: size,
        background: tone.bg,
        color: tone.fg,
        fontSize,
        borderRadius: Math.max(6, Math.round(size * 0.28)),
      }}
      aria-hidden="true"
    >
      {letters}
    </span>
  );
}
