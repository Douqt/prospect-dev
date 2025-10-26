'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GameStateManager } from '@/lib/card-game/game-state';
import { CombatSystem } from '@/lib/card-game/combat-system';
import { Card as CardComponent } from './Card';
import { Button } from '@/components/ui/button';
import { Card } from '@/types/card-game';


export function GameBoard() {
  const [gameState] = useState(() => new GameStateManager('normal'));
  const [gameData, setGameData] = useState(gameState.getGameState());
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [isTestMode, setIsTestMode] = useState(false);
  const [opponentSelectedCards, setOpponentSelectedCards] = useState<string[]>([]);
  const [combatMode, setCombatMode] = useState<'selecting' | 'targeting' | null>(null);
  const [selectedAttacker, setSelectedAttacker] = useState<string | null>(null);
  const [showDirectAttackOption, setShowDirectAttackOption] = useState(false);
  const [attackAnimation, setAttackAnimation] = useState<{attackerId: string, targetId: string} | null>(null);
  const [abilityAnimations, setAbilityAnimations] = useState<Array<{
    id: string;
    sourceCardId: string;
    targetCardId?: string;
    animationType: string;
    description: string;
  }>>([]);
  const [cardRefs] = useState(() => new Map<string, React.RefObject<HTMLDivElement>>());
  const [battlefieldRef] = useState(() => React.createRef<HTMLDivElement>());
  const [isAutoAttacking, setIsAutoAttacking] = useState(false);
  const [pendingAbilities, setPendingAbilities] = useState<Array<{
    card: Card;
    ability: any;
    gameData: any;
  }>>([]);
  const [abilityTargetingMode, setAbilityTargetingMode] = useState<{
    isActive: boolean;
    sourceCardId: string;
    abilityType: string;
    targetType: 'ally' | 'enemy';
    validTargetIds: string[];
  } | null>(null);

  // Force update counter for triggering re-renders when gameState internal state changes
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Update game data when state changes or updateTrigger changes
  useEffect(() => {
    const interval = setInterval(() => {
      setGameData(gameState.getGameState());
    }, 100);
    return () => clearInterval(interval);
  }, [gameState, updateTrigger]);

  // Function to trigger UI update
  const triggerUpdate = () => {
    setUpdateTrigger(prev => prev + 1);
  };

  const addToLog = (message: string) => {
    setGameLog(prev => [...prev.slice(-4), message]);
  };

  // Auto-scroll game log to bottom when it updates
  useEffect(() => {
    const logContainer = document.querySelector('[data-game-log]');
    if (logContainer) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  }, [gameLog]);

  // Reset combat mode when not in combat phase
  useEffect(() => {
    if (gameData.turnPhase !== 'combat') {
      setCombatMode(null);
      setSelectedAttacker(null);
    }
  }, [gameData.turnPhase]);

  // Reset ability targeting mode when not in main phase
  useEffect(() => {
    if (gameData.turnPhase !== 'main') {
      setAbilityTargetingMode(null);
    }
  }, [gameData.turnPhase]);

  // Auto-attack for opponent when entering combat phase - only when it's opponent's turn
  useEffect(() => {
    if (gameData.turnPhase === 'combat' && !isAutoAttacking && gameData.gamePhase === 'playing' && gameData.currentPlayerIndex === 1) {
      performOpponentAutoAttacks();
    }
  }, [gameData.turnPhase, gameData.gamePhase, isAutoAttacking, gameData.currentPlayerIndex]);

  // Auto-play cards for opponent when entering main phase
  useEffect(() => {
    if (gameData.turnPhase === 'main' && gameData.gamePhase === 'playing' && gameData.currentPlayerIndex === 1) {
      // Small delay to ensure the phase has fully transitioned before playing cards
      const timer = setTimeout(() => {
        performOpponentAutoPlay();
        gameState.nextPhase();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [gameData.turnPhase, gameData.gamePhase, gameData.currentPlayerIndex]);

  // AUTO-ADVANCE PHASES ONLY FOR OPPONENT - NEVER FOR PLAYER
  useEffect(() => {
    // ONLY trigger for AI opponent (player 2) - NEVER for human player (player 1)
    if (gameData.currentPlayerIndex === 1 && gameData.gamePhase === 'playing') {

      const timer = setTimeout(() => {
        // TRIPLE-CHECK: This should NEVER run for human player
        const freshState = gameState.getGameState();

        // Extra safety check - ensure we're still in opponent turn
        if (freshState.currentPlayerIndex !== 1 || freshState.gamePhase !== 'playing') {
          console.log('Auto-advance cancelled - not opponent turn:', {
            currentPlayerIndex: freshState.currentPlayerIndex,
            gamePhase: freshState.gamePhase
          });
          return;
        }

        // Auto-advance through all phases for AI
        if (freshState.turnPhase === 'draw') {
          console.log('AI auto-advancing from draw phase');
          gameState.nextPhase();
          addToLog('OPPONENT AI AUTO-ADVANCED FROM DRAW');
        } else if (freshState.turnPhase === 'main') {
          // Don't auto-advance if opponent has playable cards during main phase
          const playableCards = freshState.opponentHand.filter(card => card.OVR <= freshState.opponentCredits);
          if (playableCards.length > 0) {
            console.log('Auto-advance paused - opponent has playable cards:', playableCards.length);
            return;
          }
          console.log('AI auto-advancing from main phase');
          gameState.nextPhase();
          addToLog('OPPONENT AI AUTO-ADVANCED FROM MAIN');
        } else if (freshState.turnPhase === 'combat') {
          console.log('AI auto-advancing from combat phase');
          gameState.nextPhase();
          addToLog('OPPONENT AI AUTO-ADVANCED FROM COMBAT');
        } else if (freshState.turnPhase === 'end') {
          console.log('AI auto-advancing from end phase');
          gameState.nextPhase();
          addToLog('OPPONENT AI AUTO-ADVANCED FROM END');
        }

        triggerUpdate();
      }, 3000); // 3 seconds for each phase

      return () => clearTimeout(timer);
    } else if (gameData.currentPlayerIndex === 0) {
      console.log('Human player turn - no auto-advance');
    }
  }, [gameData.currentPlayerIndex, gameData.turnPhase]);

  const executeOpponentAttack = async (attackerId: string, targetId: string) => {
    setAttackAnimation({ attackerId, targetId });

    const attacker = gameData.opponentField.find(card => card.id === attackerId);
    const target = gameData.playerField.find(card => card.id === targetId);

    if (attacker && target) {
      const combatResult = CombatSystem.calculateDamage(attacker, target);
      await new Promise(resolve => setTimeout(resolve, 1000));
      gameState.damageCard(targetId, combatResult.damage, true); // true = player card

      const preview = CombatSystem.getCombatPreview(attacker, target);
      addToLog(`${attacker.name} attacks ${target.name} for ${combatResult.damage} damage (${preview.description})`);

      if (target.currentHealth <= 0) {
        addToLog(`${target.name} was destroyed!`);
      }

      // Mark card as having attacked this combat phase
      gameState.addAttacked(attackerId);
    }

    setAttackAnimation(null);
    setCombatMode(null);
    setSelectedAttacker(null);

    setTimeout(() => {
      const updatedGameData = gameState.getGameState();
      if (updatedGameData.playerHealth <= 0) {
        addToLog('Defeat! You were defeated!');
      }
    }, 100);
  };


  // Function to perform automatic attacks for opponent during combat phase
  const performOpponentAutoAttacks = useCallback(async () => {
    if (isAutoAttacking) return;

    setIsAutoAttacking(true);
    const opponentField = gameData.opponentField;
    const playerField = gameData.playerField;

    // Get opponent cards that haven't attacked this combat phase
    const attackers = opponentField.filter(card => !gameData.attackedThisCombatPhase.includes(card.id));

    for (const attacker of attackers) {
      if (playerField.length > 0) {
        // Attack a random player card
        const randomTarget = playerField[Math.floor(Math.random() * playerField.length)];
        await executeOpponentAttack(attacker.id, randomTarget.id);
      } else {
        // Direct attack on player life if no player cards
        const damage = attacker.OVR + (attacker.powerModifier || 0);
        gameState.damagePlayer(damage, true); // true = player (opponent attacking player)
        gameState.addAttacked(attacker.id);

        setAttackAnimation({
          attackerId: attacker.id,
          targetId: 'player-life'
        });

        addToLog(`${attacker.name} directly attacks player for ${damage} damage!`);

        await new Promise(resolve => setTimeout(resolve, 1000));
        setAttackAnimation(null);
      }

      // Small delay between attacks
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // After all attacks are done, mark as completed (don't auto-advance here)
    setTimeout(() => {
      setIsAutoAttacking(false);
      addToLog('Opponent completed combat phase');
      triggerUpdate();
    }, 1000);
  }, [isAutoAttacking, gameData, setIsAutoAttacking, setAttackAnimation, addToLog, triggerUpdate, executeOpponentAttack]);

  // Function to perform automatic card playing for opponent during main phase
  const performOpponentAutoPlay = async () => {
    const opponentHand = gameData.opponentHand;
    const opponentCredits = gameData.opponentCredits;

    if (opponentHand.length === 0) {
      addToLog('Opponent has no cards in hand');
      return;
    }

    // Find playable cards: cards that the AI can afford individually
    const playableCards = opponentHand.filter(card => card.OVR <= opponentCredits);

    if (playableCards.length === 0) {
      addToLog('Opponent cannot afford any cards');
      return;
    }

    // Play only ONE card at a time (cheapest first)
    const sortedPlayableCards = playableCards.sort((a, b) => a.OVR - b.OVR);
    const cardToPlay = sortedPlayableCards[0];
    const cardIds = [cardToPlay.id];

    const success = gameState.playCards(cardIds, true);
    if (success) {
      // Process abilities immediately for this single card
      const freshGameData = gameState.getGameState();
      const playedCards = [cardToPlay];

      // Process abilities immediately when card is played
      for (const card of playedCards) {
        const ability = CombatSystem.getCardAbility(card);
        if (ability) {
          if (ability.type === 'limited') {
            // Handle Limited cards with two effects
            CombatSystem.applyAbilityEffect(
              ability,
              card,
              undefined,
              freshGameData.opponentHealth,
              (newHealth) => {
                // Update opponent health
                if (newHealth !== freshGameData.opponentHealth) {
                  gameState.damagePlayer(freshGameData.opponentHealth - newHealth, false);
                }
              },
              freshGameData.playerHealth,
              (newHealth) => {
                // Update player health
                if (newHealth !== freshGameData.playerHealth) {
                  gameState.damagePlayer(freshGameData.playerHealth - newHealth, true);
                }
              }
            );
            addToLog(`${card.name} activates dual abilities!`);
          } else {
            // Handle single abilities - auto-target for opponent
            let targetCard;
            switch (ability.target) {
              case 'enemy':
                if (ability.type === 'directDamage') {
                  // Direct damage doesn't need a specific target
                } else {
                  targetCard = freshGameData.playerField[Math.floor(Math.random() * freshGameData.playerField.length)];
                }
                break;
              case 'ally': {
                const otherAllies = freshGameData.opponentField.filter((c: Card) => c.id !== card.id);
                targetCard = otherAllies[Math.floor(Math.random() * otherAllies.length)];
                break;
              }
              case 'self':
                targetCard = card;
                break;
            }

            if (ability.type === 'directDamage' || ability.target === 'self' || !targetCard) {
              // Apply directly if no valid target or self-targeting or direct damage
              CombatSystem.applyAbilityEffect(
                ability,
                card,
                targetCard,
                freshGameData.opponentHealth,
                (newHealth) => {
                  if (newHealth !== freshGameData.opponentHealth) {
                    gameState.damagePlayer(freshGameData.opponentHealth - newHealth, false);
                  }
                },
                freshGameData.playerHealth,
                (newHealth) => {
                  if (newHealth !== freshGameData.playerHealth) {
                    gameState.damagePlayer(freshGameData.playerHealth - newHealth, true);
                  }
                }
              );
            } else if (targetCard) {
              // Apply with target
              CombatSystem.applyAbilityEffect(
                ability,
                card,
                targetCard,
                freshGameData.opponentHealth,
                (newHealth) => {
                  if (newHealth !== freshGameData.opponentHealth) {
                    gameState.damagePlayer(freshGameData.opponentHealth - newHealth, false);
                  }
                },
                freshGameData.playerHealth,
                (newHealth) => {
                  if (newHealth !== freshGameData.playerHealth) {
                    gameState.damagePlayer(freshGameData.playerHealth - newHealth, true);
                  }
                }
              );
            }

            const description = getAbilityDescription(card, ability, targetCard);
            addToLog(description);
          }
        }
      }

      addToLog(`Opponent played ${cardToPlay.name}`);
      triggerUpdate();

      // Wait a bit before potentially playing another card
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      addToLog('Opponent failed to play cards');
    }
  };

  const executeCombat = async (attackerId: string, targetId: string) => {
    setAttackAnimation({ attackerId, targetId });

    const attacker = gameData.playerField.find(card => card.id === attackerId);
    const target = gameData.opponentField.find(card => card.id === targetId);

    if (attacker && target) {
      // Card-to-card attack
      const combatResult = CombatSystem.calculateDamage(attacker, target);
      await new Promise(resolve => setTimeout(resolve, 1000));
      gameState.damageCard(targetId, combatResult.damage, false);

      const preview = CombatSystem.getCombatPreview(attacker, target);
      addToLog(`${attacker.name} (${attacker.sector}) attacks ${target.name} (${target.sector}) for ${combatResult.damage} damage (${preview.description})`);

      if (target.currentHealth <= 0) {
        addToLog(`${target.name} was destroyed!`);
      }
    } else if (attacker && targetId === 'opponent-life') {
      // Direct attack on opponent
      const damage = attacker.OVR + (attacker.powerModifier || 0);
      await new Promise(resolve => setTimeout(resolve, 1000));
      gameState.damagePlayer(damage, false); // false = opponent

      addToLog(`${attacker.name} directly attacks opponent for ${damage} damage!`);
    }

    // Mark card as having attacked this combat phase
    gameState.addAttacked(attackerId);

    setAttackAnimation(null);
    setCombatMode(null);
    setSelectedAttacker(null);

    setTimeout(() => {
      const updatedGameData = gameState.getGameState();
      if (updatedGameData.opponentHealth <= 0) {
        addToLog('Victory! Opponent defeated!');
      }
    }, 100);
  };

  
  const getAvailableActions = gameState.getAvailableActions();

  const getAbilityDescription = (card: Card, ability: any, targetCard?: Card) => {
    switch (ability.type) {
      case 'weaken':
        return `${card.name} weakens ${targetCard?.name} by ${ability.value}%!`;
      case 'powerToHealth':
        return `${card.name} converts ${Math.floor(card.OVR * 0.5)} power to life points!`;
      case 'directDamage':
        return `${card.name} deals ${Math.floor(card.OVR * 0.2)} direct damage to opponent!`;
      case 'increasePower':
        return `${card.name} boosts ${targetCard?.name} by ${Math.floor((targetCard?.OVR || 0) * 0.5)} power!`;
      case 'lock':
        return `${card.name} locks ${targetCard?.name} and loses ${targetCard?.OVR} power!`;
      default:
        return `${card.name} uses ${ability.type} ability!`;
    }
  };

  const handleFieldCardClick = (cardId: string, isOpponentCard: boolean) => {
    const actions = getAvailableActions;

    console.log('Card clicked:', cardId, 'isOpponentCard:', isOpponentCard);
    console.log('Current ability targeting mode:', abilityTargetingMode);
    console.log('Game data current player:', gameData.currentPlayerIndex);
    console.log('Current turn phase:', gameData.turnPhase);

    // Only allow clicks during main phase (for abilities) or combat phase (for attacks)
    if (gameData.turnPhase !== 'main' && gameData.turnPhase !== 'combat') {
      return;
    }

    // Handle ability targeting only during main phase
    if (gameData.turnPhase === 'main' && abilityTargetingMode && gameData.currentPlayerIndex === 0) {
      console.log('In ability targeting mode, checking if valid target...');
      console.log('Valid target IDs:', abilityTargetingMode.validTargetIds);
      console.log('Clicked card ID:', cardId);
      console.log('Is valid target?', abilityTargetingMode.validTargetIds.includes(cardId));

      const isValidTarget = abilityTargetingMode.validTargetIds.includes(cardId);

      if (isValidTarget) {
        console.log('Valid target clicked, applying ability...');

        // Select this card as the ability target
        const success = gameState.selectAbilityTarget(cardId);

        if (success) {
          console.log('Ability applied successfully');
          // Clear ability targeting mode
          setAbilityTargetingMode(null);
          return;
        }
      } else {
        console.log('Clicked card is not a valid target');
      }
    }

    // Check if we're in combat targeting mode (for attacking)
    if (combatMode === 'targeting' && selectedAttacker && gameData.currentPlayerIndex === 0) {
      const attackerCard = gameData.playerField.find(c => c.id === selectedAttacker);
      if (attackerCard) {
        const ability = CombatSystem.getCardAbility(attackerCard);
        if (ability && ability.target !== 'self') {
          // Handle ability targeting for cards that have abilities
          const isValidTarget = (isOpponentCard && ability.target === 'enemy') ||
                               (!isOpponentCard && ability.target === 'ally');

          if (isValidTarget) {
            const targetCard = isOpponentCard
              ? gameData.opponentField.find(c => c.id === cardId)
              : gameData.playerField.find(c => c.id === cardId);

            if (targetCard) {
              const success = CombatSystem.applyAbilityEffect(
                ability,
                attackerCard,
                targetCard,
                gameData.playerHealth,
                (newHealth: number) => {
                  // Update player health through game state
                  if (newHealth !== gameData.playerHealth) {
                    gameState.damagePlayer(gameData.playerHealth - newHealth, true);
                    triggerUpdate();
                  }
                },
                gameData.opponentHealth,
                (newHealth: number) => {
                  // Update opponent health through game state
                  if (newHealth !== gameData.opponentHealth) {
                    gameState.damagePlayer(gameData.opponentHealth - newHealth, false);
                    triggerUpdate();
                  }
                }
              );

              if (success) {
                const description = getAbilityDescription(attackerCard, ability, targetCard);
                addToLog(description);

                // Add animation
                const animationId = `ability-${Date.now()}`;
                setAbilityAnimations(prev => [...prev, {
                  id: animationId,
                  sourceCardId: attackerCard.id,
                  targetCardId: targetCard.id,
                  animationType: ability.type,
                  description
                }]);

                setTimeout(() => {
                  setAbilityAnimations(prev => prev.filter(anim => anim.id !== animationId));
                }, 1500);
              }

              setCombatMode(null);
              setSelectedAttacker(null);
              return;
            }
          }
        }
      }
    }

    // HUMAN PLAYER ATTACKING LOGIC - only during combat phase
    if (gameData.currentPlayerIndex === 0 && gameData.turnPhase === 'combat') {
      if (isOpponentCard) {
        // Player is clicking opponent card - this should be the TARGET of attack
        if (combatMode === 'targeting' && selectedAttacker) {
          // Check if the card is locked
          const targetCard = gameData.opponentField.find(c => c.id === cardId);
          if (targetCard && targetCard.isLocked) {
            // Locked card cannot block, but player can still attack it
            executeCombat(selectedAttacker, cardId);
          } else {
            // Normal attack on opponent card
            executeCombat(selectedAttacker, cardId);
          }
        }
      } else {
        // Player is clicking their own card - this should be the ATTACKER
        const card = gameData.playerField.find(c => c.id === cardId);
        if (!card) return;

        // Check if this card has already attacked this combat phase
        if (gameData.attackedThisCombatPhase.includes(cardId) && gameData.turnPhase === 'combat') {
          addToLog(`${card.name} has already attacked this turn`);
          return;
        }

        if (combatMode === 'selecting' || combatMode === null) {
          // Select player's card as attacker
          setSelectedAttacker(cardId);
          setCombatMode('targeting');

          // Check if direct attack is possible
          const canDirectAttack = CombatSystem.canApplyDirectDamage(gameData.opponentField);

          if (canDirectAttack) {
            // Show direct attack option
            setShowDirectAttackOption(true);
            addToLog('Select target: opponent card or direct attack');
          } else if (gameData.opponentField.length === 0) {
            // Execute direct attack immediately if no opponent cards
            executeCombat(cardId, 'opponent-life');
          } else {
            addToLog('Select opponent card to attack');
          }
        } else if (combatMode === 'targeting' && selectedAttacker === cardId) {
          // Deselect if clicking the same card
          setSelectedAttacker(null);
          setCombatMode('selecting');
          setShowDirectAttackOption(false);
          addToLog('Attack cancelled');
        }
      }
    }

    // AI OPPONENT ATTACKING LOGIC (for test mode) - only during combat phase
    if (gameData.currentPlayerIndex === 1 && isTestMode && gameData.turnPhase === 'combat') {
      if (isOpponentCard) {
        const card = gameData.opponentField.find(c => c.id === cardId);
        if (!card) return;

        // Check if opponent card has already attacked this combat phase
        if (gameData.attackedThisCombatPhase.includes(cardId) && gameData.turnPhase === 'combat') {
          addToLog(`${card.name} has already attacked this turn`);
          return;
        }

        if (combatMode !== 'targeting') {
          // Select opponent card as attacker
          setSelectedAttacker(cardId);
          setCombatMode('targeting');
          addToLog('Selected opponent card to attack');
        } else if (combatMode === 'targeting' && selectedAttacker === cardId) {
          // Deselect opponent card
          setSelectedAttacker(null);
          setCombatMode(null);
          addToLog('Attack cancelled');
        }
      } else {
        // Opponent card attacking player field card
        if (combatMode === 'targeting' && selectedAttacker && gameData.opponentField.some(card => card.id === selectedAttacker)) {
          executeOpponentAttack(selectedAttacker, cardId);
          return;
        }
      }
    }
  };

  const handleCardSelect = (cardId: string) => {
    if (gameData.currentPlayerIndex !== 0 || gameData.gamePhase !== 'playing') return;

    const card = gameData.playerHand.find(c => c.id === cardId);
    if (!card) return;

    // Only allow playing one card at a time
    if (selectedCards.length === 0) {
      setSelectedCards([cardId]);
    } else if (selectedCards.includes(cardId)) {
      setSelectedCards([]);
    }
  };

  const handlePlayCards = async () => {
    if (selectedCards.length === 0) return;

    console.log('Playing cards:', selectedCards.length);

    // Get the cards that were actually played before playing them
    const playedCards = selectedCards.map(id => gameData.playerHand.find(card => card.id === id)).filter(Boolean);

    console.log('Cards actually played:', playedCards.length, playedCards.map(c => c.name));

    const success = gameState.playCards(selectedCards);
    if (success) {
      // Show card playing log FIRST - use actual count
      const actualCount = playedCards.length;
      addToLog(`Played ${actualCount} card${actualCount !== 1 ? 's' : ''}`);

      // Process ALL abilities immediately when cards are played
      const freshGameData = gameState.getGameState();
      await processAbilitiesWithTargeting(playedCards, freshGameData);

      setSelectedCards([]);
      triggerUpdate();
    } else {
      addToLog('Failed to play cards - check requirements');
    }
  };

  const processAbilitiesWithTargeting = async (playedCards: Card[], gameData: any) => {
    for (const card of playedCards) {
      const ability = CombatSystem.getCardAbility(card);
      if (ability) {
        if (ability.type === 'limited') {
          // Handle Limited cards with two effects
          await processLimitedAbility(card, ability, gameData);
        } else {
          // Handle single abilities with targeting
          await processSingleAbility(card, ability, gameData);
        }
      }
    }
  };

  const processSingleAbility = async (card: Card, ability: any, gameData: any) => {
    console.log('Processing ability for card:', card.name, 'ability type:', ability.type, 'target:', ability.target);

    // Handle self-targeting and direct damage abilities (no targeting needed)
    if (ability.target === 'self' || ability.type === 'directDamage') {
      console.log('Processing self-targeting or direct damage ability');
      let targetCard: Card | undefined;

      if (ability.target === 'self') {
        targetCard = card;
      }

      // Apply the ability directly
      const success = CombatSystem.applyAbilityEffect(
        ability,
        card,
        targetCard,
        gameData.playerHealth,
        (newHealth: number) => {
          // Update player health through game state
          if (newHealth !== gameData.playerHealth) {
            gameState.damagePlayer(gameData.playerHealth - newHealth, true);
            triggerUpdate();
          }
        },
        gameData.opponentHealth,
        (newHealth: number) => {
          // Update opponent health through game state
          if (newHealth !== gameData.opponentHealth) {
            gameState.damagePlayer(gameData.opponentHealth - newHealth, false);
            triggerUpdate();
          }
        }
      );

      if (success) {
        const description = getAbilityDescription(card, ability, targetCard);
        addToLog(description);

        // Add animation
        const animationId = `ability-${Date.now()}`;
        setAbilityAnimations(prev => [...prev, {
          id: animationId,
          sourceCardId: card.id,
          targetCardId: targetCard?.id,
          animationType: ability.type,
          description
        }]);

        await new Promise(resolve => setTimeout(resolve, 1500));
        setAbilityAnimations(prev => prev.filter(anim => anim.id !== animationId));
      }
      return;
    }

    // Handle abilities that need manual targeting (Epic, Common, Legendary)
    if (ability.target === 'ally' || ability.target === 'enemy') {
      console.log('Starting manual targeting for ability:', ability.type, 'target type:', ability.target);

      // Start manual targeting using the new game state system
      const targetType = ability.target;
      const success = gameState.startAbilityTargeting(card.id, ability.type, targetType);

      console.log('startAbilityTargeting result:', success);

      if (success) {
        // Update local state to reflect targeting mode
        const freshGameData = gameState.getGameState();
        const pendingAbility = freshGameData.pendingAbility;

        console.log('Pending ability from game state:', pendingAbility);

        if (pendingAbility) {
          console.log('Setting ability targeting mode with valid targets:', pendingAbility.validTargetIds);

          const targetingMode = {
            isActive: true,
            sourceCardId: card.id,
            abilityType: ability.type,
            targetType: targetType,
            validTargetIds: pendingAbility.validTargetIds,
          };

          console.log('Setting ability targeting mode object:', targetingMode);
          setAbilityTargetingMode(targetingMode);

          console.log('Ability targeting mode set, current state should be:', targetingMode);
          addToLog(`Choose target for ${card.name}'s ability: ${ability.type}`);

          // Wait for player to select target (with timeout to prevent infinite loop)
          const targetSelected = await new Promise<string | null>((resolve) => {
            const timeoutId: NodeJS.Timeout = setTimeout(() => {
              console.log('Ability targeting timed out');
              gameState.cancelAbilityTargeting();
              setAbilityTargetingMode(null);
              resolve(null);
            }, 30000);

            const checkForTargetSelection = () => {
              const currentGameData = gameState.getGameState();
              if (!currentGameData.pendingAbility) {
                console.log('No pending ability found, targeting completed');
                // Targeting completed or cancelled
                resolve(currentGameData.selectedTargetId);
                clearTimeout(timeoutId);
              } else {
                // Still waiting for target selection
                setTimeout(checkForTargetSelection, 100);
              }
            };

            setTimeout(checkForTargetSelection, 100);
          });

          console.log('Target selection completed, targetSelected:', targetSelected);

          // Clear targeting mode
          setAbilityTargetingMode(null);

          // Reset selectedTargetId
          gameState.resetSelectedTargetId();

          if (targetSelected) {
            console.log('Target was selected:', targetSelected);
            // Ability was applied successfully, add animation
            const targetCard = targetType === 'ally'
              ? gameData.playerField.find(c => c.id === targetSelected)
              : gameData.opponentField.find(c => c.id === targetSelected);

            if (targetCard) {
              const description = getAbilityDescription(card, ability, targetCard);

              // Add animation
              const animationId = `ability-${Date.now()}`;
              setAbilityAnimations(prev => [...prev, {
                id: animationId,
                sourceCardId: card.id,
                targetCardId: targetCard.id,
                animationType: ability.type,
                description
              }]);

              setTimeout(() => {
                setAbilityAnimations(prev => prev.filter(anim => anim.id !== animationId));
              }, 1500);
            }
          } else {
            console.log('No target was selected');
          }
        } else {
          console.log('No pending ability found after startAbilityTargeting');
          addToLog(`No valid targets for ${card.name}'s ability`);
        }
      } else {
        console.log('startAbilityTargeting failed');
        addToLog(`No valid targets for ${card.name}'s ability`);
      }
    }
  };

  const processLimitedAbility = async (card: Card, ability: any, gameData: any) => {
    // Handle Limited cards with two effects - simplified for now
    const success = CombatSystem.applyAbilityEffect(
      ability,
      card,
      undefined,
      gameData.playerHealth,
      (newHealth: number) => {
        gameData.playerHealth = newHealth;
        triggerUpdate();
      },
      gameData.opponentHealth,
      (newHealth: number) => {
        gameData.opponentHealth = newHealth;
        triggerUpdate();
      }
    );

    if (success) {
      addToLog(`${card.name} activates dual abilities!`);
    }
  };



  // Check if player can advance phases (must resolve all pending abilities first)
  const canAdvancePhase = getAvailableActions.canAdvancePhase && pendingAbilities.length === 0 && gameData.currentPlayerIndex === 0;

  if (gameData.gamePhase === 'gameOver') {
    return (
      <div className="min-h-screen bg-slate-900 p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Game Over!</h1>
          <p className="text-xl text-slate-300 mb-8">
            {gameData.winner === 'player1' ? 'You Win!' : 'Opponent Wins!'}
          </p>
          <Button onClick={() => { gameState.reset(); setGameLog([]); }}>
            Play Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-900 flex overflow-hidden pt-24 pl-[244px]">
      {/* Game Sidebar */}
      <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col flex-shrink-0 -mt-7">
        {/* Game Title */}
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-xl font-bold text-yellow-400 text-center">
            STOCK WARS
          </h1>
        </div>

        {/* Game Status */}
        <div className="p-2 space-y-1.5">
          {/* Turn Info */}
          <div className="bg-slate-700/50 rounded-lg p-1">
            <div className="text-xs text-slate-300 mb-0.5">Current Turn</div>
            <div className="text-base font-bold text-white">{gameData.currentTurn}</div>
          </div>

          {/* Player Status */}
          <div className="space-y-1">
            {/* Player Info */}
            <div data-player-status className="bg-blue-900/30 rounded-lg p-1 border border-blue-500/30">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  P
                </div>
                <div>
                  <div className="text-xs font-semibold text-blue-400">Player</div>
                  <div className="text-xs text-slate-400">You</div>
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-300">Life Points</span>
                  <span className="text-xs font-bold text-white">{gameData.playerHealth}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1">
                  <div
                    className="bg-blue-500 h-1 rounded-full transition-all duration-500"
                    style={{ width: `${(gameData.playerHealth / 1000) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Opponent Info */}
            <div data-opponent-status className="bg-red-900/30 rounded-lg p-1 border border-red-500/30">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  AI
                </div>
                <div>
                  <div className="text-xs font-semibold text-red-400">Opponent</div>
                  <div className="text-xs text-slate-400">Computer</div>
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-300">Life Points</span>
                  <span className="text-xs font-bold text-white">{gameData.opponentHealth}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1">
                  <div
                    className="bg-red-500 h-1 rounded-full transition-all duration-500"
                    style={{ width: `${(gameData.opponentHealth / 1000) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Game Stats */}
          <div className="bg-slate-700/50 rounded-lg p-1">
            <div className="text-xs text-slate-300 mb-0.5">Game Statistics</div>
            <div className="space-y-0.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-300">Credits</span>
                <span className="text-xs font-bold text-yellow-400">
                  {gameData.currentPlayerIndex === 0 ? gameData.playerCredits : gameData.opponentCredits}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-300">Mode</span>
                <span className="text-xs font-medium text-purple-400 capitalize">{gameData.gameMode}</span>
              </div>
            </div>
          </div>

        {/* Turn Indicator */}
          <div className="bg-slate-700/50 rounded-lg p-1">
            <div className="text-xs text-slate-300 mb-0.5">Turn Status</div>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${gameData.currentPlayerIndex === 0 ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-xs font-bold text-white">
                {gameData.currentPlayerIndex === 0 ? 'Your Turn' : 'Opponent Turn'}
              </span>
            </div>
          </div>

          {/* Timer */}
          <div className="bg-slate-700/50 rounded-lg p-1">
            <div className="text-xs text-slate-300 mb-0.5">Turn Timer</div>
            <div className="text-sm font-bold text-white">∞</div>
            <div className="text-xs text-slate-400">No limit</div>
          </div>
        </div>

        {/* Game Log */}
        <div className="flex-1 p-2 min-h-0 flex flex-col">
          <div className="text-yellow-400 font-bold text-xs mb-1 flex-shrink-0">Game Log</div>
          <div
            data-game-log
            className="flex-1 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800"
            style={{
              scrollBehavior: 'smooth',
              minHeight: 0,
            }}
          >
            {gameLog.map((log, index) => (
              <div key={index} className="text-xs text-slate-300 font-mono bg-slate-900/50 p-1.5 rounded">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* Main Game Board */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Section - Opponent Hand */}
        <div className="flex-shrink-0 p-2">
          <div className="text-red-400 font-semibold text-center text-sm">OPPONENT AREA</div>
          <div className="flex justify-center items-center gap-2">
            {/* Opponent Discard */}
            <div className="w-20 h-28 border border-slate-600 rounded flex items-center justify-center bg-slate-800/20 flex-shrink-0">
              <span className="text-red-400 text-xs font-medium text-center">Opp<br/>Discard</span>
            </div>

            {/* Opponent Hand Cards */}
            <div className="flex justify-center gap-1">
              {isTestMode ? (
                gameData.opponentHand.map(card => (
                  <CardComponent
                    key={card.id}
                    card={card}
                    isPlayable={true}
                    isSelected={opponentSelectedCards.includes(card.id)}
                    onClick={() => {
                      setOpponentSelectedCards(prev => {
                        const isSelected = prev.includes(card.id);
                        if (isSelected) {
                          return [];
                        } else {
                          // Only allow selecting one card at a time
                          return [card.id];
                        }
                      });
                    }}
                    className="opacity-80"
                  />
                ))
              ) : (
                Array.from({ length: gameData.opponentHand.length }, (_, index) => (
                  <div key={index} className="w-20 h-28 rounded border-2 border-slate-600 bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <div className="text-slate-400 text-xs font-bold text-center">
                      CARD<br/>BACK
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Opponent Deck */}
            <div className="w-20 h-28 border border-slate-600 rounded flex items-center justify-center bg-slate-800/20 flex-shrink-0">
              <span className="text-red-400 text-xs font-medium text-center">Opp<br/>Deck</span>
            </div>
          </div>

          {/* Direct Attack Hitbox - appears when direct attack is possible */}
          {showDirectAttackOption && gameData.currentPlayerIndex === 0 && gameData.turnPhase === 'combat' && (
            <div className="mt-2 flex justify-center">
              <div
                data-direct-attack-hitbox
                className="w-32 h-16 border-2 border-dashed border-yellow-400 rounded-lg flex items-center justify-center cursor-pointer hover:bg-yellow-400/20 transition-all animate-pulse"
                onClick={() => {
                  if (selectedAttacker) {
                    executeCombat(selectedAttacker, 'opponent-life');
                    setShowDirectAttackOption(false);
                  }
                }}
              >
                <span className="text-yellow-400 font-bold text-sm text-center">
                  DIRECT<br/>ATTACK
                </span>
              </div>
            </div>
          )}

          {/* Opponent Test Controls */}
          <div className={`mt-1 flex justify-center gap-1 ${!isTestMode ? 'invisible pointer-events-none' : ''}`}>
            <Button
              size="sm"
              onClick={() => {
                if (opponentSelectedCards.length > 0) {
                  const success = gameState.playCards(opponentSelectedCards, true);
                  if (success) {
                    const playedCards = gameData.opponentHand.filter(card =>
                      opponentSelectedCards.includes(card.id)
                    );
                    addToLog(`Opponent played ${playedCards.length} cards`);
                    setOpponentSelectedCards([]);
                  } else {
                    addToLog('Failed to play opponent cards');
                  }
                }
              }}
              disabled={gameData.currentPlayerIndex !== 1}
              className="bg-red-600 text-white text-xs"
            >
              OPPONENT PLAY {opponentSelectedCards.length} CARD{opponentSelectedCards.length !== 1 ? 'S' : ''}
            </Button>

            <Button
              size="sm"
              onClick={() => {
                gameState.nextPhase();
                addToLog('Opponent advanced to next phase');
              }}
              disabled={gameData.currentPlayerIndex !== 1}
              variant="outline"
              className="border-green-400 text-green-400 text-xs px-2 py-1"
            >
              NEXT PHASE OPPONENT
            </Button>

            <Button
              size="sm"
              onClick={() => {
                gameState.endTurn();
                setOpponentSelectedCards([]);
                addToLog('Opponent ended turn');
              }}
              disabled={gameData.currentPlayerIndex !== 1}
              variant="outline"
              className="border-red-400 text-red-400 text-xs px-2 py-1"
            >
              END OPPONENT TURN
            </Button>
          </div>
        
        </div>

        {/* Middle Section - Game Board */}
        <div className="flex-grow flex flex-col justify-center px-2 relative" ref={battlefieldRef}>
          {/* Attack Animation Overlay */}
          {attackAnimation && battlefieldRef.current && (
            <div className="absolute inset-0 pointer-events-none z-10">
              {(() => {
                const battlefield = battlefieldRef.current;
                const rect = battlefield.getBoundingClientRect();

                let attackerPosition = { x: 0, y: 0 };
                let targetPosition = { x: 0, y: 0 };

                // Get card slot positions
                const opponentSlots = battlefield.querySelectorAll('[data-opponent-slot]');
                const playerSlots = battlefield.querySelectorAll('[data-player-slot]');

                // Find attacker position
                if (gameData.playerField.some(card => card.id === attackAnimation.attackerId)) {
                  const attackerIndex = gameData.playerField.findIndex(card => card.id === attackAnimation.attackerId);
                  if (playerSlots[attackerIndex]) {
                    const slotRect = playerSlots[attackerIndex].getBoundingClientRect();
                    attackerPosition = {
                      x: slotRect.left + slotRect.width / 2 - rect.left,
                      y: slotRect.top + slotRect.height / 2 - rect.top
                    };
                  }
                } else if (gameData.opponentField.some(card => card.id === attackAnimation.attackerId)) {
                  const attackerIndex = gameData.opponentField.findIndex(card => card.id === attackAnimation.attackerId);
                  if (opponentSlots[attackerIndex]) {
                    const slotRect = opponentSlots[attackerIndex].getBoundingClientRect();
                    attackerPosition = {
                      x: slotRect.left + slotRect.width / 2 - rect.left,
                      y: slotRect.top + slotRect.height / 2 - rect.top
                    };
                  }
                }

                // Find target position
                if (attackAnimation.targetId === 'opponent-life') {
                  // Direct attack on opponent - check if direct attack hitbox exists
                  const directAttackHitbox = document.querySelector('[data-direct-attack-hitbox]');
                  if (directAttackHitbox) {
                    // Target the direct attack hitbox
                    const hitboxRect = directAttackHitbox.getBoundingClientRect();
                    targetPosition = {
                      x: hitboxRect.left + hitboxRect.width / 2 - rect.left,
                      y: hitboxRect.top + hitboxRect.height / 2 - rect.top
                    };
                  } else {
                    // Fallback to opponent status
                    const opponentStatus = document.querySelector('[data-opponent-status]');
                    if (opponentStatus) {
                      const statusRect = opponentStatus.getBoundingClientRect();
                      targetPosition = {
                        x: statusRect.left + statusRect.width / 2 - rect.left,
                        y: statusRect.top + statusRect.height / 2 - rect.top
                      };
                    }
                  }
                } else if (attackAnimation.targetId === 'player-life') {
                  // Direct attack on player life - target the center of player status
                  const playerStatus = document.querySelector('[data-player-status]');
                  if (playerStatus) {
                    const statusRect = playerStatus.getBoundingClientRect();
                    targetPosition = {
                      x: statusRect.left + statusRect.width / 2 - rect.left,
                      y: statusRect.top + statusRect.height / 2 - rect.top
                    };
                  }
                } else if (gameData.opponentField.some(card => card.id === attackAnimation.targetId)) {
                  const targetIndex = gameData.opponentField.findIndex(card => card.id === attackAnimation.targetId);
                  if (opponentSlots[targetIndex]) {
                    const slotRect = opponentSlots[targetIndex].getBoundingClientRect();
                    targetPosition = {
                      x: slotRect.left + slotRect.width / 2 - rect.left,
                      y: slotRect.top + slotRect.height / 2 - rect.top
                    };
                  }
                } else if (gameData.playerField.some(card => card.id === attackAnimation.targetId)) {
                  const targetIndex = gameData.playerField.findIndex(card => card.id === attackAnimation.targetId);
                  if (playerSlots[targetIndex]) {
                    const slotRect = playerSlots[targetIndex].getBoundingClientRect();
                    targetPosition = {
                      x: slotRect.left + slotRect.width / 2 - rect.left,
                      y: slotRect.top + slotRect.height / 2 - rect.top
                    };
                  }
                }

                return (
                  <svg className="w-full h-full" viewBox={`0 0 ${rect.width} ${rect.height}`} preserveAspectRatio="none">
                    <line
                      x1={attackerPosition.x}
                      y1={attackerPosition.y}
                      x2={targetPosition.x}
                      y2={targetPosition.y}
                      stroke="#ef4444"
                      strokeWidth="3"
                      strokeDasharray="6,3"
                      className="animate-pulse"
                      opacity="0.9"
                    />
                  </svg>
                );
              })()}
            </div>
          )}

          {/* Ability Animation Overlay */}
          {abilityAnimations.map((abilityAnim) => {
            if (!battlefieldRef.current) return null;

            return (() => {
              const battlefield = battlefieldRef.current;
              const rect = battlefield.getBoundingClientRect();

              let sourcePosition = { x: 0, y: 0 };
              let targetPosition = { x: 0, y: 0 };

              // Get card slot positions
              const opponentSlots = battlefield.querySelectorAll('[data-opponent-slot]');
              const playerSlots = battlefield.querySelectorAll('[data-player-slot]');

              // Find source card position
              if (gameData.playerField.some(card => card.id === abilityAnim.sourceCardId)) {
                const sourceIndex = gameData.playerField.findIndex(card => card.id === abilityAnim.sourceCardId);
                if (playerSlots[sourceIndex]) {
                  const slotRect = playerSlots[sourceIndex].getBoundingClientRect();
                  sourcePosition = {
                    x: slotRect.left + slotRect.width / 2 - rect.left,
                    y: slotRect.top + slotRect.height / 2 - rect.top
                  };
                }
              } else if (gameData.opponentField.some(card => card.id === abilityAnim.sourceCardId)) {
                const sourceIndex = gameData.opponentField.findIndex(card => card.id === abilityAnim.sourceCardId);
                if (opponentSlots[sourceIndex]) {
                  const slotRect = opponentSlots[sourceIndex].getBoundingClientRect();
                  sourcePosition = {
                    x: slotRect.left + slotRect.width / 2 - rect.left,
                    y: slotRect.top + slotRect.height / 2 - rect.top
                  };
                }
              }

              // Find target position
              if (abilityAnim.targetCardId) {
                if (gameData.playerField.some(card => card.id === abilityAnim.targetCardId)) {
                  const targetIndex = gameData.playerField.findIndex(card => card.id === abilityAnim.targetCardId);
                  if (playerSlots[targetIndex]) {
                    const slotRect = playerSlots[targetIndex].getBoundingClientRect();
                    targetPosition = {
                      x: slotRect.left + slotRect.width / 2 - rect.left,
                      y: slotRect.top + slotRect.height / 2 - rect.top
                    };
                  }
                } else if (gameData.opponentField.some(card => card.id === abilityAnim.targetCardId)) {
                  const targetIndex = gameData.opponentField.findIndex(card => card.id === abilityAnim.targetCardId);
                  if (opponentSlots[targetIndex]) {
                    const slotRect = opponentSlots[targetIndex].getBoundingClientRect();
                    targetPosition = {
                      x: slotRect.left + slotRect.width / 2 - rect.left,
                      y: slotRect.top + slotRect.height / 2 - rect.top
                    };
                  }
                }
              } else {
                // Target opponent life for direct damage
                const opponentStatus = document.querySelector('[data-opponent-status]');
                if (opponentStatus) {
                  const statusRect = opponentStatus.getBoundingClientRect();
                  targetPosition = {
                    x: statusRect.left + statusRect.width / 2 - rect.left,
                    y: statusRect.top + statusRect.height / 2 - rect.top
                  };
                }
              }

              // Different colors for different ability types
              let strokeColor = '#3b82f6'; // Blue for default
              let animationClass = 'animate-pulse';

              switch (abilityAnim.animationType) {
                case 'weaken':
                  strokeColor = '#ef4444'; // Red
                  animationClass = 'animate-pulse';
                  break;
                case 'heal':
                  strokeColor = '#10b981'; // Green
                  animationClass = 'animate-pulse';
                  // Determine target based on source card location
                  if (gameData.playerField.some(card => card.id === abilityAnim.sourceCardId)) {
                    // Player card healing, target player life
                    const playerStatus = document.querySelector('[data-player-status]');
                    if (playerStatus) {
                      const statusRect = playerStatus.getBoundingClientRect();
                      targetPosition = {
                        x: statusRect.left + statusRect.width / 2 - rect.left,
                        y: statusRect.top + statusRect.height / 2 - rect.top
                      };
                    }
                  } else if (gameData.opponentField.some(card => card.id === abilityAnim.sourceCardId)) {
                    // Opponent card healing, target opponent life
                    const opponentStatus = document.querySelector('[data-opponent-status]');
                    if (opponentStatus) {
                      const statusRect = opponentStatus.getBoundingClientRect();
                      targetPosition = {
                        x: statusRect.left + statusRect.width / 2 - rect.left,
                        y: statusRect.top + statusRect.height / 2 - rect.top
                      };
                    }
                  }
                  break;
                case 'directDamage':
                  strokeColor = '#f59e0b'; // Orange
                  animationClass = 'animate-pulse';
                  // Determine target based on source card location
                  if (gameData.playerField.some(card => card.id === abilityAnim.sourceCardId)) {
                    // Player direct damage, target opponent life
                    const opponentStatus = document.querySelector('[data-opponent-status]');
                    if (opponentStatus) {
                      const statusRect = opponentStatus.getBoundingClientRect();
                      targetPosition = {
                        x: statusRect.left + statusRect.width / 2 - rect.left,
                        y: statusRect.top + statusRect.height / 2 - rect.top
                      };
                    }
                  } else if (gameData.opponentField.some(card => card.id === abilityAnim.sourceCardId)) {
                    // Opponent direct damage, target player life
                    const playerStatus = document.querySelector('[data-player-status]');
                    if (playerStatus) {
                      const statusRect = playerStatus.getBoundingClientRect();
                      targetPosition = {
                        x: statusRect.left + statusRect.width / 2 - rect.left,
                        y: statusRect.top + statusRect.height / 2 - rect.top
                      };
                    }
                  }
                  break;
                case 'powerBoost':
                  strokeColor = '#8b5cf6'; // Purple
                  animationClass = 'animate-pulse';
                  break;
                case 'lock':
                  strokeColor = '#6b7280'; // Gray
                  animationClass = 'animate-pulse';
                  break;
                case 'limited':
                  strokeColor = '#ec4899'; // Pink
                  animationClass = 'animate-pulse';
                  break;
              }

              return (
                <div key={abilityAnim.id} className="absolute inset-0 pointer-events-none z-10">
                  <svg className="w-full h-full" viewBox={`0 0 ${rect.width} ${rect.height}`} preserveAspectRatio="none">
                    <line
                      x1={sourcePosition.x}
                      y1={sourcePosition.y}
                      x2={targetPosition.x}
                      y2={targetPosition.y}
                      stroke={strokeColor}
                      strokeWidth="4"
                      strokeDasharray="8,4"
                      className={animationClass}
                      opacity="0.8"
                    />
                    <circle
                      cx={targetPosition.x}
                      cy={targetPosition.y}
                      r="8"
                      fill={strokeColor}
                      className="animate-ping"
                      opacity="0.6"
                    />
                  </svg>
                </div>
              );
            })();
          })}

          {/* Main Battlefield */}
          <div className="flex flex-col justify-center gap-2">
            {/* Opponent Monster Zone */}
            <div className="flex flex-col">
              <div className="flex justify-center gap-1">
                {Array.from({ length: 5 }, (_, index) => {
                  const card = gameData.opponentField[index];
                  const isValidTarget = abilityTargetingMode?.targetType === 'enemy' && abilityTargetingMode.validTargetIds.includes(card?.id || '');

                  return (
                    <div key={`opponent-${index}`} data-opponent-slot={index} className="w-20 h-28 border border-slate-600 rounded flex items-center justify-center bg-slate-800/20 flex-shrink-0 relative">
                      {card ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <CardComponent
                            card={card}
                            showStats={false}
                            isSelected={combatMode === 'targeting' && selectedAttacker !== null}
                            onClick={() => handleFieldCardClick(card.id, true)}
                            className={`${gameData.turnPhase === 'combat' && combatMode === 'targeting' && selectedAttacker !== null ? 'cursor-pointer animate-pulse ring-2 ring-red-400 rounded-lg' : ''} ${gameData.turnPhase === 'main' && isValidTarget ? 'ring-2 ring-green-400 animate-pulse cursor-pointer' : ''}`}
                          />
                        </div>
                      ) : null}
                      {/* Card has attacked indicator */}
                      {card && gameData.attackedThisCombatPhase.includes(card.id) && (
                        <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border border-white"></div>
                      )}
                      {/* Valid target indicator */}
                      {isValidTarget && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Center Field */}
            <div className="flex justify-center items-center py-2">
              <div className="flex gap-2 bg-slate-800/50 rounded-lg p-3">
                {[
                  { phase: 'draw', name: 'Draw Phase' },
                  { phase: 'main', name: 'Main Phase' },
                  { phase: 'combat', name: 'Combat Phase' },
                  { phase: 'end', name: 'End Phase' }
                ].map(({ phase, name }) => (
                  <div
                    key={phase}
                    className={`px-3 py-2 rounded text-center font-medium text-xs transition-all ${
                      gameData.turnPhase === phase
                        ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    <div style={{ whiteSpace: 'pre-line' }}>{name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Player Monster Zone */}
            <div className="flex flex-col">
              <div className="flex justify-center gap-1">
                {Array.from({ length: 5 }, (_, index) => {
                  const card = gameData.playerField[index];
                  const isValidTarget = abilityTargetingMode?.targetType === 'ally' && abilityTargetingMode.validTargetIds.includes(card?.id || '');

                  return (
                    <div key={`player-${index}`} data-player-slot={index} className="w-20 h-28 border border-slate-600 rounded flex items-center justify-center bg-slate-800/20 flex-shrink-0 relative">
                      {card ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <CardComponent
                            card={card}
                            showStats={false}
                            isSelected={selectedAttacker === card.id}
                            onClick={() => handleFieldCardClick(card.id, false)}
                            className={`${selectedAttacker === card.id ? 'ring-2 ring-blue-400 rounded-lg' : ''} ${gameData.turnPhase === 'combat' && combatMode === 'targeting' && selectedAttacker && gameData.opponentField.some(oppCard => oppCard.id === selectedAttacker) ? 'cursor-pointer animate-pulse ring-2 ring-red-400 rounded-lg' : ''} ${gameData.turnPhase === 'combat' && combatMode === 'selecting' ? 'cursor-pointer' : ''} ${gameData.turnPhase === 'main' && isValidTarget ? 'ring-2 ring-green-400 animate-pulse cursor-pointer' : ''}`}
                          />
                        </div>
                      ) : null}
                      {/* Card has attacked indicator */}
                      {card && gameData.attackedThisCombatPhase.includes(card.id) && (
                        <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border border-white"></div>
                      )}
                      {/* Valid target indicator */}
                      {isValidTarget && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Player Hand & Controls */}
        <div className="flex-shrink-0 p-2">
          {/* Player Hand with Deck and Discard */}
          <div className="p-2 rounded-lg mx-2">
            <div className="text-blue-400 font-semibold text-center text-xs mb-0.5">
              YOUR HAND ({gameData.playerHand.length})
              {selectedCards.length > 0 && (
                <> - Select {selectedCards.length} card{selectedCards.length !== 1 ? 's' : ''}</>
              )}
            </div>
            {/* {selectedCards.length > 0 && (
              <div className="text-yellow-400 font-medium text-center text-sm mb-1">
                Total Cost: {(() => {
                  const totalCost = gameData.playerHand
                    .filter(card => selectedCards.includes(card.id))
                    .reduce((sum, card) => sum + card.OVR, 0);
                  return totalCost;
                })()} Credits
              </div>
            )} */}
            <div className="flex justify-center items-center gap-2 pb-0.5">
              {/* Player Discard */}
              <div className="w-20 h-28 border border-slate-600 rounded flex items-center justify-center bg-slate-800/20 flex-shrink-0">
                <span className="text-blue-400 text-xs font-medium text-center">Your<br/>Discard</span>
              </div>

              {/* Player Hand Cards */}
              <div className="flex justify-center gap-1">
                {gameData.playerHand.map(card => (
                  <CardComponent
                    key={card.id}
                    card={card}
                    isPlayable={true}
                    isSelected={selectedCards.includes(card.id)}
                    onClick={() => handleCardSelect(card.id)}
                  />
                ))}
              </div>

              {/* Player Deck */}
              <div className="w-20 h-28 border border-slate-600 rounded flex items-center justify-center bg-slate-800/20 flex-shrink-0">
                <span className="text-blue-400 text-xs font-medium text-center">Your<br/>Deck</span>
              </div>
            </div>
          </div>

          {/* Game Controls */}
          <div className="flex justify-center gap-1.5 flex-wrap mx-2 pb-1">
            <Button
              size="sm"
              onClick={() => {
                const currentPhase = gameData.turnPhase;
                const currentTurn = gameData.currentTurn;

                // If on turn 1 and in main phase, skip combat and go to end
                if (currentTurn === 1 && currentPhase === 'main') {
                  // nextPhase will handle skipping combat if no cards on field
                  // and will auto-end turn when reaching end phase
                  gameState.nextPhase();
                  addToLog(`Turn 1: Advanced phase`);
                  triggerUpdate();
                  return;
                }

                // Normal phase advancement
                gameState.nextPhase();
                const updatedData = gameState.getGameState();

                // Only log if we didn't auto-end the turn
                if (updatedData.currentTurn === currentTurn) {
                  addToLog(`Advanced to ${updatedData.turnPhase} phase`);
                } else {
                  addToLog(`Turn ended automatically`);
                  setSelectedCards([]);
                }

                triggerUpdate();
              }}
              disabled={!canAdvancePhase}
              variant="outline"
              className={`text-xs px-2 py-1 ${canAdvancePhase ? 'border-green-400 text-green-400' : 'border-red-400 text-red-400'}`}
            >
              {pendingAbilities.length > 0 ? `RESOLVE ABILITIES (${pendingAbilities.length})` : 'NEXT PHASE'}
            </Button>

            <Button
              size="sm"
              onClick={() => {
                // End Turn button: immediately end the current turn
                gameState.endTurn();
                addToLog(`Ended turn immediately`);
                setSelectedCards([]); // Clear selection
                triggerUpdate(); // Force UI update
              }}
              disabled={!getAvailableActions.canAdvancePhase}
              variant="outline"
              className="border-yellow-400 text-yellow-400 text-xs px-2 py-1"
            >
              END TURN
            </Button>

            <Button
              size="sm"
              onClick={handlePlayCards}
              disabled={selectedCards.length === 0 || !getAvailableActions.canPlayCards}
              className="bg-blue-600 text-white text-xs"
            >
              PLAY {selectedCards.length} CARD{selectedCards.length !== 1 ? 'S' : ''}
            </Button>

            <Button
              size="sm"
              onClick={() => {
                gameState.reset();
                setSelectedCards([]);
                setGameLog([]);
              }}
              variant="outline"
              className="border-gray-400 text-gray-400 text-xs px-2 py-1"
            >
              RESET
            </Button>

            <Button
              size="sm"
              onClick={() => setIsTestMode(!isTestMode)}
              variant={isTestMode ? "default" : "outline"}
              className={isTestMode
                ? "bg-purple-600 text-white text-xs"
                : "border-purple-400 text-purple-400 text-xs"
              }
            >
              {isTestMode ? 'SANDBOX OFF' : 'SANDBOX ON'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
