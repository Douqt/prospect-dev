// Define valid forums for each category type
// This ensures posts only appear in the correct section
import { STOCK_FORUMS as STOCK_FORUMS_DATA } from '@/lib/stockForums';
import { CRYPTO_FORUMS as CRYPTO_FORUMS_DATA } from '@/lib/cryptoForums';
import { FUTURES_FORUMS as FUTURES_FORUMS_DATA } from '@/lib/futuresForums';

export const STOCK_FORUMS = STOCK_FORUMS_DATA;
export const CRYPTO_FORUMS = CRYPTO_FORUMS_DATA;

export const FUTURES_FORUMS = FUTURES_FORUMS_DATA;

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
  return Object.hasOwn(FUTURES_FORUMS, category.toUpperCase()) || category === 'futures';
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
  ...Object.keys(FUTURES_FORUMS),
  ...GENERAL_FORUMS
];
