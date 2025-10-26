import { GameState, Card, GameSettings, AbilityEffect } from '@/types/card-game';
import { generateDeck, shuffleArray, drawCards, getPlayerHealthForMode, DEFAULT_GAME_SETTINGS } from './game-utils';

export class GameStateManager {
  private gameState: GameState;
  private settings: GameSettings;

  constructor(gameMode: 'easy' | 'normal' | 'hard' = 'normal') {
    this.settings = DEFAULT_GAME_SETTINGS;

    // Initialize game state
    const playerDeck = generateDeck(this.settings.maxDeckSize);
    const opponentDeck = generateDeck(this.settings.maxDeckSize);

    this.gameState = {
      playerHealth: getPlayerHealthForMode(gameMode),
      opponentHealth: getPlayerHealthForMode(gameMode),
      playerCredits: this.settings.creditsPerTurn, // Start with credits on turn 1
      opponentCredits: 200, // AI starts with 200 credits total, not refreshed per turn
      currentTurn: 1,
      currentPlayerIndex: 0, // Player 1 (human) starts first
      playerHand: [],
      opponentHand: [],
      playerDeck: shuffleArray(playerDeck),
      opponentDeck: shuffleArray(opponentDeck),
      playerField: [],
      opponentField: [],
      gamePhase: 'playing',
      turnPhase: 'main', // First player starts in main phase
      gameMode,
  canAttackThisTurn: false, // First turn cannot attack
  selectedAttackers: [],
  selectedTargets: [],
  attackedThisCombatPhase: [], // Track which cards have already attacked this combat phase
  pendingAbility: undefined, // Ability targeting system
  selectedTargetId: null, // Selected target for ability
    };

    // Draw initial hands
    this.drawInitialHands();
  }

  // Get current game state (read-only)
  getGameState(): Readonly<GameState> {
    return { ...this.gameState };
  }

  // Draw initial hands for both players
  private drawInitialHands(): void {
    const { drawn: playerCards, remainingDeck: playerDeck } = drawCards(
      this.gameState.playerDeck,
      this.settings.maxHandSize
    );

    const { drawn: opponentCards, remainingDeck: opponentDeck } = drawCards(
      this.gameState.opponentDeck,
      this.settings.maxHandSize
    );

    this.gameState.playerHand = playerCards;
    this.gameState.opponentHand = opponentCards;
    this.gameState.playerDeck = playerDeck;
    this.gameState.opponentDeck = opponentDeck;
  }

  // Start new turn
  startNewTurn(): void {
    if (this.gameState.gamePhase !== 'playing') return;

    // Reset card effects and modifiers at turn start
    this.resetCardEffects();

    // Enable attacking for the new turn (except first turn)
    if (this.gameState.currentTurn > 1) {
      this.gameState.canAttackThisTurn = true;
    }

    // Switch turns
    this.gameState.currentPlayerIndex = this.gameState.currentPlayerIndex === 0 ? 1 : 0;
    this.gameState.currentTurn++;

    // Set credits to 200 for new turn
    if (this.gameState.currentPlayerIndex) this.gameState.playerCredits = this.settings.creditsPerTurn;
    else this.gameState.opponentCredits = this.settings.creditsPerTurn;

    // All players now start in DRAW PHASE
    this.gameState.turnPhase = 'draw';
    this.performDrawPhase();

    // Check for game over conditions
    this.checkGameOver();
  }

  // Advance to next phase
  nextPhase(): void {
    if (this.gameState.gamePhase !== 'playing') return;

    const phases: Array<'draw' | 'main' | 'combat' | 'end'> = ['draw', 'main', 'combat', 'end'];
    const currentIndex = phases.indexOf(this.gameState.turnPhase);
    const nextIndex = (currentIndex + 1) % phases.length;

    if (phases[nextIndex] === 'combat' && this.gameState.currentTurn === 1) {
      // Skip combat, go directly to end phase
      this.endTurn()
      // Don't call startNewTurn yet - let the UI show end phase first
      return;
    }

    // Check if we're advancing to Combat phase: skip if current player (whose turn it is) has no cards on field
    if (phases[nextIndex] === 'combat') {
      const currentPlayerField = this.gameState.currentPlayerIndex === 0 ? this.gameState.playerField : this.gameState.opponentField;
      if (currentPlayerField.length === 0) {
        // No cards on field, go to end phase first
        this.endTurn()
        return;
      }
    }

    // Move to next phase
    this.gameState.turnPhase = phases[nextIndex];

    // If entering combat phase, clear attacked tracking
    if (this.gameState.turnPhase === 'combat') {
      this.gameState.attackedThisCombatPhase = [];
    }

    // If we just moved to End phase, DON'T immediately end the turn
    // Let it show for a moment, then the UI will call nextPhase again or endTurn
    if (this.gameState.turnPhase === 'end') {
      this.endTurn()
    }
  }

  // Perform draw phase - draw cards to fill hand to 7 cards, 1 by 1 slowly
  private async performDrawPhase(): Promise<void> {
    const isPlayer1 = this.gameState.currentPlayerIndex === 0;
    const hand = isPlayer1 ? this.gameState.playerHand : this.gameState.opponentHand;
    const deck = isPlayer1 ? this.gameState.playerDeck : this.gameState.opponentDeck;

    // Only draw if we need cards and have cards in deck
    if (hand.length < this.settings.maxHandSize && deck.length > 0) {
      const cardsToDraw = Math.min(
        this.settings.maxHandSize - hand.length,
        deck.length
      );

      for (let i = 0; i < cardsToDraw; i++) {
        const card = deck[i];

        // Add to hand
        hand.push(card);

        // Remove from deck
        if (isPlayer1) {
          this.gameState.playerDeck = deck.slice(i + 1);
        } else {
          this.gameState.opponentDeck = deck.slice(i + 1);
        }

        // Trigger animation here
        //this.animateCardDraw(card);

        // Wait 0.5 seconds before drawing the next card
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    this.nextPhase();
  }

  // Reset temporary card effects at turn start
  private resetCardEffects(): void {
    // Reset player field cards
    this.gameState.playerField.forEach(card => {
      card.powerModifier = 0;
      card.isLocked = false;
    });

    // Reset opponent field cards
    this.gameState.opponentField.forEach(card => {
      card.powerModifier = 0;
      card.isLocked = false;
    });
  }

  // Play cards from hand to field
  playCards(cardIds: string[], isOpponent: boolean = false): boolean {
    if (this.gameState.gamePhase !== 'playing') {
      return false;
    }

    const hand = isOpponent ? this.gameState.opponentHand : this.gameState.playerHand;
    const field = isOpponent ? this.gameState.opponentField : this.gameState.playerField;
    const credits = isOpponent ? this.gameState.opponentCredits : this.gameState.playerCredits;

    const cardsToPlay = hand.filter(card =>
      cardIds.includes(card.id)
    );

    // Validate play requirements
    if (cardsToPlay.length < this.settings.minCardsPerTurn ||
        cardsToPlay.length > this.settings.maxCardsPerTurn) {
      return false;
    }

    // Calculate total cost
    const totalCost = cardsToPlay.reduce((sum, card) => sum + card.OVR, 0);

    if (credits < totalCost) {
      return false;
    }

    // Deduct credits and move cards to field
    if (isOpponent) {
      this.gameState.opponentCredits -= totalCost;
    } else {
      this.gameState.playerCredits -= totalCost;
    }

    cardsToPlay.forEach(card => {
      const index = hand.findIndex(c => c.id === card.id);
      if (index !== -1) {
        hand.splice(index, 1);
        field.push(card);
      }
    });



    return true;
  }

  // Apply damage to a card
  damageCard(cardId: string, damage: number, isPlayerCard: boolean): boolean {
    const field = isPlayerCard ? this.gameState.playerField : this.gameState.opponentField;
    const card = field.find(c => c.id === cardId);

    if (!card) return false;

    console.log(`Damaging ${card.name}: ${card.currentHealth} - ${damage} = ${card.currentHealth - damage}`);

    card.currentHealth -= damage;

    // Remove card if health <= 0
    if (card.currentHealth <= 0) {
      console.log(`Removing ${card.name} - health: ${card.currentHealth}`);
      const index = field.findIndex(c => c.id === cardId);
      if (index !== -1) {
        field.splice(index, 1);
      }
    }

    return true;
  }

  // Apply damage to player/opponent health
  damagePlayer(damage: number, isPlayer: boolean): void {
    if (isPlayer) {
      this.gameState.playerHealth -= damage;
    } else {
      this.gameState.opponentHealth -= damage;
    }
  }

  // Check if game is over
  private checkGameOver(): void {
    if (this.gameState.playerHealth <= 0) {
      this.gameState.gamePhase = 'gameOver';
      this.gameState.winner = 'player2'; // Player 2 (opponent) wins if player 1 dies
    } else if (this.gameState.opponentHealth <= 0) {
      this.gameState.gamePhase = 'gameOver';
      this.gameState.winner = 'player1'; // Player 1 wins if player 2 dies
    }
  }

  // Mark a card as having attacked this combat phase
  addAttacked(cardId: string): void {
    if (!this.gameState.attackedThisCombatPhase.includes(cardId)) {
      this.gameState.attackedThisCombatPhase.push(cardId);
    }
  }

  // Get available actions for current turn
  getAvailableActions(): {
    canPlayCards: boolean;
    canAdvancePhase: boolean;
    canAttack: boolean;
    minCards: number;
    maxCards: number;
    availableCredits: number;
  } {
    const isHumanTurn = this.gameState.currentPlayerIndex === 0; // Player 1 (human)
    const isPlaying = this.gameState.gamePhase === 'playing';
    const phase = this.gameState.turnPhase;

    return {
      canPlayCards: isHumanTurn && isPlaying && phase === 'main',
      canAdvancePhase: isHumanTurn && isPlaying,
      canAttack: isHumanTurn && isPlaying && phase === 'combat' && this.gameState.canAttackThisTurn,
      minCards: this.settings.minCardsPerTurn,
      maxCards: this.settings.maxCardsPerTurn,
      availableCredits: this.gameState.playerCredits,
    };
  }

  // Force end current turn immediately - New method added for END TURN button
  async endTurn(): Promise<void> {
    if (this.gameState.gamePhase !== 'playing') return;

    this.gameState.turnPhase = "end";

    // Heal the current player with ALL unspent credits (no cap)
    const isCurrentPlayer1 = this.gameState.currentPlayerIndex === 0;
    const currentPlayerCredits = isCurrentPlayer1 ? this.gameState.playerCredits : this.gameState.opponentCredits;

    if (currentPlayerCredits > 0) {
      const healAmount = currentPlayerCredits; // Use ALL unspent credits for healing
      if (isCurrentPlayer1) {
        this.gameState.playerHealth += healAmount;
        this.gameState.playerCredits -= healAmount;
      } else {
        this.gameState.opponentHealth += healAmount;
        this.gameState.opponentCredits -= healAmount;
      }
    }

    // Wait 0.5 seconds before starting the new turn
    await new Promise(resolve => setTimeout(resolve, 500));

    this.startNewTurn();
  }

  // Reset game to initial state
  reset(gameMode?: 'easy' | 'normal' | 'hard'): void {
    const mode = gameMode || this.gameState.gameMode;

    const playerDeck = generateDeck(this.settings.maxDeckSize);
    const opponentDeck = generateDeck(this.settings.maxDeckSize);

    this.gameState = {
      playerHealth: getPlayerHealthForMode(mode),
      opponentHealth: getPlayerHealthForMode(mode),
      playerCredits: this.settings.creditsPerTurn,
      opponentCredits: 200, // AI starts with 200 credits total
      currentTurn: 1,
      currentPlayerIndex: 0, // Player 1 (human) starts
      playerHand: [],
      opponentHand: [],
      playerDeck: shuffleArray(playerDeck),
      opponentDeck: shuffleArray(opponentDeck),
      playerField: [],
      opponentField: [],
      gamePhase: 'playing',
      turnPhase: 'main', // Start first player in main phase
      gameMode: mode,
      canAttackThisTurn: false,
      selectedAttackers: [],
      selectedTargets: [],
      attackedThisCombatPhase: [],
      pendingAbility: undefined,
      selectedTargetId: null,
    };

    this.drawInitialHands();
  }

  // Start ability targeting for a card
  startAbilityTargeting(cardId: string, abilityType: AbilityEffect['type'], targetType: 'ally' | 'enemy'): boolean {
    if (this.gameState.gamePhase !== 'playing' || this.gameState.currentPlayerIndex !== 0) {
      return false; // Only human player can manually target abilities
    }

    const sourceCard = this.gameState.playerField.find(card => card.id === cardId);
    if (!sourceCard) return false;

    // Get valid target IDs based on target type
    let validTargetIds: string[] = [];

    if (targetType === 'ally') {
      // All player field cards (including the source card that was just played)
      validTargetIds = this.gameState.playerField
        .map(card => card.id);
    } else if (targetType === 'enemy') {
      // All opponent field cards
      validTargetIds = this.gameState.opponentField.map(card => card.id);
    }

    if (validTargetIds.length === 0) {
      return false; // No valid targets available
    }

    this.gameState.pendingAbility = {
      sourceCardId: cardId,
      abilityType,
      targetType,
      validTargetIds,
    };

    return true;
  }

  // Select target for pending ability
  selectAbilityTarget(targetCardId: string): boolean {
    if (!this.gameState.pendingAbility) return false;

    const { sourceCardId, abilityType, validTargetIds } = this.gameState.pendingAbility;

    if (!validTargetIds.includes(targetCardId)) {
      return false; // Invalid target
    }

    // Find the source and target cards
    const sourceCard = this.gameState.playerField.find(card => card.id === sourceCardId);
    let targetCard: Card | undefined;

    if (this.gameState.pendingAbility.targetType === 'ally') {
      targetCard = this.gameState.playerField.find(card => card.id === targetCardId);
    } else {
      targetCard = this.gameState.opponentField.find(card => card.id === targetCardId);
    }

    if (!sourceCard || !targetCard) return false;

    // Apply the ability effect
    const ability: AbilityEffect = {
      type: abilityType,
      target: this.gameState.pendingAbility.targetType,
      value: this.getAbilityValue(abilityType),
      duration: 1,
    };

    const success = this.applyAbilityEffect(ability, sourceCard, targetCard);

    // Set selected target
    this.gameState.selectedTargetId = targetCardId;

    // Clear pending ability
    this.gameState.pendingAbility = undefined;

    return success;
  }

  // Cancel pending ability targeting
  cancelAbilityTargeting(): void {
    this.gameState.pendingAbility = undefined;
  }

  // Reset selected target ID
  resetSelectedTargetId(): void {
    this.gameState.selectedTargetId = null;
  }

  // Get ability value based on type
  private getAbilityValue(abilityType: AbilityEffect['type']): number {
    switch (abilityType) {
      case 'weaken':
        return 25; // 25% reduction
      case 'increasePower':
        return 50; // 50% boost
      case 'lock':
        return 0; // Uses target's OVR value
      default:
        return 25;
    }
  }

  // Apply ability effect (simplified version for game state manager)
  private applyAbilityEffect(ability: AbilityEffect, sourceCard: Card, targetCard: Card): boolean {
    switch (ability.type) {
      case 'weaken':
        if (ability.target === 'enemy') {
          const reduction = Math.floor(targetCard.OVR * 0.25);
          targetCard.powerModifier = (targetCard.powerModifier || 0) - reduction;
          return true;
        }
        break;

      case 'increasePower':
        if (ability.target === 'ally') {
          const powerBoost = Math.floor(targetCard.OVR * 0.5);
          targetCard.powerModifier = (targetCard.powerModifier || 0) + powerBoost;
          return true;
        }
        break;

      case 'powerToHealth':
        if (ability.target === 'self') {
          const healthBoost = Math.floor(sourceCard.OVR * 0.5);
          sourceCard.currentHealth += healthBoost;
          return true;
        }
        break;

      case 'directDamage':
        // This is handled in the UI layer with setOpponentHealth/setPlayerHealth
        return true;

      case 'lock':
        if (ability.target === 'enemy') {
          targetCard.isLocked = true;
          const powerReduction = targetCard.OVR;
          sourceCard.powerModifier = (sourceCard.powerModifier || 0) - powerReduction;
          return true;
        }
        break;
    }

    return false;
  }
}
