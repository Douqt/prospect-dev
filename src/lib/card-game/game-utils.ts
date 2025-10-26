import { Card, CardStats, CardSector, Rarity, GameSettings } from '@/types/card-game';
import { STOCK_FORUMS } from '@/lib/stockForums';
import { STOCK_WARS } from '@/lib/stockwars';

// Seeded random number generator for consistent server/client rendering
class SeededRandom {
  private seed: number;

  constructor(seed?: number) {
    // Use a fixed seed for consistent card generation between server and client
    this.seed = seed || 12345; // Fixed seed to ensure same cards are generated
  }

  random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }
}

// Global seeded random instance
const seededRandom = new SeededRandom();

// Calculate OVR from card stats (10-100, always positive)
export function calculateOVR(stats: CardStats): number {
  const { price, marketCap, volume } = stats;

  // Ensure all values are valid numbers
  const safePrice = Math.max(0, isNaN(price) ? 100 : price);
  const safeMarketCap = Math.max(1, isNaN(marketCap) ? 10000000000 : marketCap);
  const safeVolume = Math.max(0, isNaN(volume) ? 1000000 : volume);

  /* 1.  PRICE  –  pure power curve  $0 → 0 pts , $250 → 70 pts */
  const priceScore = Math.min(70, Math.pow(safePrice, 1.15) * 0.45);

  /* 2.  MARKET-CAP  –  log boost  $1 M → 0 pts , $2 T → 20 pts */
  const marketCapScore = Math.min(20, Math.max(0, Math.log10(safeMarketCap) - 6) * 4);

  /* 3.  VOLUME  –  liquidity kicker  0 → 0 pts , 150 M → 10 pts */
  const volumeScore = Math.min(10, Math.pow(safeVolume / 1e6, 0.5) * 2.6);

  const raw = priceScore + marketCapScore + volumeScore;

  // Always ensure OVR is between 10-100
  const finalOVR = Math.round(Math.max(10, Math.min(100, raw)));

  // Debug logging for troubleshooting
  if (finalOVR < 10 || finalOVR > 100) {
    console.warn('OVR calculation issue:', {
      price: safePrice,
      marketCap: safeMarketCap,
      volume: safeVolume,
      priceScore,
      marketCapScore,
      volumeScore,
      raw,
      finalOVR
    });
  }

  return finalOVR;
}

// Generate card stats from real stock data
export function generateRandomStats(symbol: string): CardStats {
  // Get stock data from STOCK_FORUMS
  const stockData = STOCK_FORUMS[symbol];

  if (stockData) {
    // Parse real stock data
    const price = parseFloat(stockData['Last Sale']?.replace('$', '') || '0') || 100;
    const marketCap = parseFloat(stockData['Market Cap']?.split('.')[0]?.replace(/,/g, '') || '10000000000');
    const volume = parseInt(stockData['Volume']?.replace(/,/g, '') || '1000000');

    return {
      price,
      marketCap,
      volume,
    };
  } else {
    // Fallback to random data if stock data not found
    return {
      price: 0,
      marketCap: 0,
      volume: 0,
    };
  }
}

// Get sector name for display
export function getSectorName(sector: CardSector): string {
  return sector;
}

// Get rarity color for UI
export function getRarityColor(rarity: Rarity): string {
  const colors = {
    Common: '#9CA3AF', // Gray
    Uncommon: '#10B981', // Green
    Rare: '#3B82F6', // Blue
    Epic: '#8B5CF6', // Purple
    Legendary: '#F59E0B', // Orange
  };
  return colors[rarity];
}

// Generate a random card with sector information
export function generateRandomCard(id?: string): Card {
  const symbol = STOCK_WARS[seededRandom.randomInt(0, STOCK_WARS.length - 1)];
  const stats = generateRandomStats(symbol);
  const OVR = calculateOVR(stats);

  // Get sector from stock data
  const stockData = STOCK_FORUMS[symbol];
  const sector: CardSector = (stockData?.Sector as CardSector) || 'Unknown';

  // Define sector relationships based on the provided data
  const SECTOR_RELATIONSHIPS = {
    'Finance': {
      strongVs: ['Real Estate', 'Utilities', 'Energy', 'Consumer Staples'],
      weakVs: ['Technology', 'Telecommunications', 'Basic Materials']
    },
    'Consumer Discretionary': {
      strongVs: ['Consumer Staples', 'Health Care', 'Utilities', 'Telecommunications'],
      weakVs: ['Industrials', 'Energy', 'Basic Materials']
    },
    'Health Care': {
      strongVs: ['Consumer Discretionary', 'Technology', 'Telecommunications', 'Miscellaneous'],
      weakVs: ['Finance', 'Real Estate', 'Consumer Staples']
    },
    'Industrials': {
      strongVs: ['Energy', 'Basic Materials', 'Utilities', 'Miscellaneous'],
      weakVs: ['Consumer Discretionary', 'Health Care', 'Real Estate']
    },
    'Technology': {
      strongVs: ['Finance', 'Industrials', 'Real Estate', 'Consumer Staples'],
      weakVs: ['Health Care', 'Utilities', 'Miscellaneous']
    },
    'Real Estate': {
      strongVs: ['Industrials', 'Energy', 'Basic Materials', 'Miscellaneous'],
      weakVs: ['Finance', 'Technology', 'Consumer Discretionary']
    },
    'Utilities': {
      strongVs: ['Technology', 'Finance', 'Consumer Discretionary', 'Health Care'],
      weakVs: ['Energy', 'Industrials', 'Real Estate']
    },
    'Energy': {
      strongVs: ['Utilities', 'Consumer Discretionary', 'Health Care', 'Real Estate'],
      weakVs: ['Finance', 'Industrials', 'Technology']
    },
    'Consumer Staples': {
      strongVs: ['Health Care', 'Miscellaneous', 'Technology', 'Finance'],
      weakVs: ['Consumer Discretionary', 'Real Estate', 'Energy']
    },
    'Telecommunications': {
      strongVs: ['Consumer Staples', 'Miscellaneous', 'Health Care', 'Finance'],
      weakVs: ['Technology', 'Industrials', 'Consumer Discretionary']
    },
    'Basic Materials': {
      strongVs: ['Industrials', 'Real Estate', 'Energy', 'Utilities'],
      weakVs: ['Consumer Discretionary', 'Technology', 'Miscellaneous']
    },
    'Miscellaneous': {
      strongVs: ['Telecommunications', 'Health Care', 'Consumer Staples', 'Finance'],
      weakVs: ['Health Care', 'Industrials', 'Technology']
    },
    'Unknown': {
      strongVs: ['Telecommunications', 'Health Care', 'Consumer Staples', 'Finance'],
      weakVs: ['Health Care', 'Industrials', 'Technology']
    }
  };

  // Get the relationships for this card's sector
  const relationships = SECTOR_RELATIONSHIPS[sector] || SECTOR_RELATIONSHIPS['Unknown'];

  // Randomly pick ONE sector from the strong against list
  const strongAgainst = relationships.strongVs[seededRandom.randomInt(0, relationships.strongVs.length - 1)] as CardSector;

  // Randomly pick ONE sector from the resistant to (weak against) list
  const resistantTo = relationships.weakVs[seededRandom.randomInt(0, relationships.weakVs.length - 1)]   as CardSector;

  const rarities: Rarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Limited'];
  const rarity = rarities[seededRandom.randomInt(0, rarities.length - 1)];

  return {
    id: id || `card_${Date.now()}_${seededRandom.random().toString(36).substr(2, 9)}`,
    symbol,
    name: symbol, // Use symbol as the name
    stats,
    OVR,
    rarity,
    sector,
    strongAgainst,
    resistantTo,
    currentHealth: OVR,
  };
}

// Generate a full deck of 60 cards
export function generateDeck(count: number = 60): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < count; i++) {
    deck.push(generateRandomCard(`card_${i}`));
  }
  return deck;
}

// Shuffle an array using Fisher-Yates algorithm
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = seededRandom.randomInt(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Draw cards from deck to hand
export function drawCards(deck: Card[], count: number): { drawn: Card[], remainingDeck: Card[] } {
  const drawn: Card[] = [];
  const remainingDeck = [...deck];

  for (let i = 0; i < count && remainingDeck.length > 0; i++) {
    const card = remainingDeck.pop();
    if (card) {
      drawn.push(card);
    }
  }

  return { drawn, remainingDeck };
}

// Default game settings
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  maxHandSize: 7,
  creditsPerTurn: 200,
  minCardsPerTurn: 1, // Must play at least 1 card per turn
  maxCardsPerTurn: 10, // Effectively unlimited (hand size is 7 anyway)
  maxDeckSize: 60,
  playerHealthByMode: {
    easy: 1000,
    normal: 600,
    hard: 200,
  },
};

// Get player health based on game mode
export function getPlayerHealthForMode(mode: 'easy' | 'normal' | 'hard'): number {
  return DEFAULT_GAME_SETTINGS.playerHealthByMode[mode];
}
