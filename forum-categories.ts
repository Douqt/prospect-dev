// Define valid forums for each category type
// This ensures posts only appear in the correct section

export const STOCK_FORUMS = [
  'TSLA', 'NVDA', 'AAPL', 'GOOGL', 'MSFT', 'AMC', 'GME', 'AMD', 'NFLX', 'FB', 'META',
  'AMZN', 'CRM', 'SHOP', 'SQ', 'PYPL', 'COIN', 'V', 'MA', 'JPM', 'BAC', 'WFC', 'C',
  'GS', 'MS', 'BX', 'BLK', 'UBS', 'JNJ', 'PFE', 'MRK', 'ABT', 'TMO', 'BMY', 'GILD',
  'KO', 'PEP', 'PG', 'CL', 'WMT', 'COST', 'TGT', 'HD', 'LOW', 'UPS', 'FDX', 'ADI',
  'AMD', 'INTC', 'NVDA', 'QCOM', 'TXN', 'AVGO', 'MU', 'LRCX', 'KLAC', 'ASML', 'NXPI',
  'NOW', 'PLTR', 'NET', 'ZS', 'CRWD', 'DDOG', 'TEAM', 'MDB', 'DOCU', 'ZM', 'ROKU',
  'SPOT', 'NFLX', 'DIS', 'CMCSA', 'T', 'VZ', 'TMUS', 'F', 'GM', 'TSLA', 'NIO',
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'APA', 'DVN', 'MRO', 'OXY', 'MAR', 'CMG',
  'MCD', 'SBUX', 'YUM', 'DRI', 'BKNG', 'EXPE', 'MAR', 'HLT', 'BA', 'LMT', 'NOC',
  'RTX', 'GD', 'HON', 'MMM', 'GE', 'CAT', 'DE', 'EMR', 'ETN', 'DOV'
];

export const CRYPTO_FORUMS = [
  'BTC', 'ETH', 'BNB', 'ADA', 'XRP', 'SOL', 'DOT', 'DOGE', 'AVAX', 'SHIB', 'MATIC',
  'ICP', 'FIL', 'ETC', 'UNI', 'LINK', 'LTC', 'XLM', 'TRX', 'ETC', 'VET', 'THETA',
  'FLOW', 'HBAR', 'CAKE', 'GRT', 'MANA', 'SAND', 'AXS', 'CHZ', 'ENJ', 'BAT', 'COMP',
  'MKR', 'AAVE', 'SUSHI', 'YFI', 'BAL', 'REN', 'KNC', 'ZRX', 'STORJ', 'ANT', 'GNT',
  'REP', 'OMG', 'BAT', 'SAN', 'NMR', 'WAVES', 'LSK', 'ARK', 'STRAT', 'XEM', 'BTG',
  'ZEC', 'DASH', 'XMR', 'BTG', 'ZEC', 'DASH', 'BTG', 'QTUM', 'BTG', 'BTG'
];

export const FUTURES_FORUMS = [
  'ES', 'NQ', 'RTY', 'YM', 'CL', 'BZ', 'NG', 'RB', 'HO', 'GC', 'SI', 'HG', 'PL',
  'PA', 'ZW', 'ZS', 'ZC', 'ZL', 'ZO', 'ZM', 'ZK', 'ZW', 'ZS', 'ZC', 'ZL', 'KE',
  'MWE', 'MWZ', 'M6A', 'M6B', 'M6E', 'TN', 'JB', 'UB', 'FV', 'TY', 'US', 'FF',
  'GE', 'GF', 'ZG', 'ZI', 'ZN', 'ZT', 'ZU', 'ZZ', 'AW', 'BO', 'SM', 'C', 'CT',
  'DX', 'EC', 'JY', 'BP', 'AD', 'CD', 'SF', 'MP', 'FC', 'LC', 'LB', 'LN', 'KW'
];

export const GENERAL_FORUMS = [
  'GENERAL', 'OPTIONS', 'TECH', 'ECONOMY', 'WORLD', 'MARKETS'
];

// Helper functions
export function isStockForum(category: string): boolean {
  return STOCK_FORUMS.includes(category.toUpperCase()) || category === 'stocks';
}

export function isCryptoForum(category: string): boolean {
  return CRYPTO_FORUMS.includes(category.toUpperCase()) || category === 'crypto';
}

export function isFuturesForum(category: string): boolean {
  return FUTURES_FORUMS.includes(category.toUpperCase()) || category === 'futures';
}

export function isAllForum(category: string): boolean {
  return ALL_VALID_FORUMS.includes(category.toUpperCase()) || category === 'all';
}

export function isGeneralForum(category: string): boolean {
  return GENERAL_FORUMS.includes(category.toUpperCase());
}

// Get all valid forums
export const ALL_VALID_FORUMS = [
  ...STOCK_FORUMS,
  ...CRYPTO_FORUMS,
  ...FUTURES_FORUMS,
  ...GENERAL_FORUMS
];
