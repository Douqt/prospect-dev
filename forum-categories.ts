// Define valid forums for each category type
// This ensures posts only appear in the correct section
import { STOCK_FORUMS as STOCK_FORUMS_DATA } from '@/lib/stockForums';
import { CRYPTO_FORUMS as CRYPTO_FORUMS_DATA } from '@/lib/cryptoForums';

export const STOCK_FORUMS = STOCK_FORUMS_DATA;
export const CRYPTO_FORUMS = CRYPTO_FORUMS_DATA;

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
  return Object.hasOwn(STOCK_FORUMS, category.toUpperCase()) || category === 'stocks';
}

export function isCryptoForum(category: string): boolean {
  return Object.hasOwn(CRYPTO_FORUMS, category.toUpperCase()) || category === 'crypto';
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
  ...Object.keys(STOCK_FORUMS),
  ...Object.keys(CRYPTO_FORUMS),
  ...FUTURES_FORUMS,
  ...GENERAL_FORUMS
];
