// Card Game Types and Interfaces

export type CardSector = 'Finance' | 'Consumer Discretionary' | 'Health Care' | 'Industrials' | 'Technology' | 'Real Estate' | 'Utilities' | 'Energy' | 'Consumer Staples' | 'Telecommunications' | 'Basic Materials' | 'Miscellaneous' | 'Unknown';

export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Limited';

export interface CardStats {
  price: number;
  marketCap: number;
  volume: number;
}

export interface Card {
  id: string;
  symbol: string; // Stock symbol
  name: string; // Keep name for backward compatibility, but display symbol
  stats: CardStats;
  OVR: number; // 0-100, calculated from stats (base stat)
  rarity: Rarity;
  sector: CardSector;
  strongAgainst: CardSector; // 1.5x damage against this sector
  resistantTo: CardSector; // 0.5x damage from this sector
  currentHealth: number; // Current health (starts as OVR)
  isLocked?: boolean;
  powerModifier?: number; // Temporary power modifications (affects both attack and health)
}

export interface GameState {
  // Player 1 (Human)
  playerHealth: number;
  playerCredits: number;
  playerHand: Card[];
  playerDeck: Card[];
  playerField: Card[];
  // Player 2 (AI Opponent)
  opponentHealth: number;
  opponentCredits: number;
  opponentHand: Card[];
  opponentDeck: Card[];
  opponentField: Card[];
  // Game state
  currentTurn: number; // Whose turn it is: even = Player 1, odd = Player 2
  currentPlayerIndex: 0 | 1; // 0 = Player 1 (human), 1 = Player 2 (AI)
  gamePhase: 'playing' | 'gameOver';
  turnPhase: 'draw' | 'main' | 'combat' | 'end';
  winner?: 'player1' | 'player2';
  gameMode: 'easy' | 'normal' | 'hard';
  canAttackThisTurn: boolean; // First turn cannot attack
  selectedAttackers: string[]; // Cards selected to attack
  selectedTargets: string[]; // Targets for attacks
  attackedThisCombatPhase: string[]; // Track which cards have already attacked this combat phase
  // Ability targeting system
  pendingAbility?: {
    sourceCardId: string;
    abilityType: AbilityEffect['type'];
    targetType: 'ally' | 'enemy';
    validTargetIds: string[];
  };
  selectedTargetId: string | null; // Selected target for ability
}

export interface GameSettings {
  maxHandSize: number;
  creditsPerTurn: number;
  minCardsPerTurn: number;
  maxCardsPerTurn: number;
  maxDeckSize: number;
  playerHealthByMode: {
    easy: number;
    normal: number;
    hard: number;
  };
}

export interface AbilityEffect {
  type: 'weaken' | 'powerToHealth' | 'directDamage' | 'increasePower' | 'lock' | 'limited';
  target?: 'enemy' | 'self' | 'ally';
  value?: number;
  duration: number; // Turns effect lasts
}

export interface CombatResult {
  attacker: Card;
  defender: Card;
  damage: number;
  categoryMultiplier: number;
  abilityTriggered?: AbilityEffect;
}
