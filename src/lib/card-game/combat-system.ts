/* eslint-disable no-case-declarations */
import { Card, CardSector, AbilityEffect, CombatResult } from '@/types/card-game';
import { getSectorName } from './game-utils';

export class CombatSystem {
  // Calculate damage between two cards considering category advantages
  static calculateDamage(attacker: Card, defender: Card): CombatResult {
    let baseDamage = attacker.OVR + (attacker.powerModifier || 0);
    let categoryMultiplier = 1;

    // Check if attacker is strong against defender's sector
    if (attacker.strongAgainst === defender.sector) {
      categoryMultiplier = 1.5; // 1.5x damage
      baseDamage = Math.floor(baseDamage * categoryMultiplier);
    }
    // Check if defender is resistant to attacker's sector
    else if (defender.resistantTo === attacker.sector) {
      categoryMultiplier = 0.5; // 0.5x damage
      baseDamage = Math.floor(baseDamage * categoryMultiplier);
    }

    const result: CombatResult = {
      attacker,
      defender,
      damage: baseDamage,
      categoryMultiplier,
    };

    return result;
  }

  // Apply combat damage to defender
  static applyCombatDamage(combatResult: CombatResult): void {
    const { defender, damage } = combatResult;
    defender.currentHealth -= damage;

    // Defender is destroyed if health <= 0
    if (defender.currentHealth <= 0) {
      defender.currentHealth = 0;
    }
  }

  // Get ability effect for a card based on its rarity
  static getCardAbility(card: Card): AbilityEffect | null {
    const { rarity, OVR } = card;

    switch (rarity) {
      case 'Common':
        return {
          type: 'weaken',
          target: 'enemy',
          value: 25, // 25% reduction
          duration: 1,
        };

      case 'Uncommon':
        return {
          type: 'powerToHealth',
          target: 'self',
          value: 50, // 50% of power added to health
          duration: 1,
        };

      case 'Rare':
        return {
          type: 'directDamage',
          target: 'enemy',
          value: 20, // 20% of power as direct damage
          duration: 1,
        };

      case 'Epic':
        return {
          type: 'increasePower',
          target: 'ally',
          value: 50, // 50% power increase
          duration: 1,
        };

      case 'Legendary':
        return {
          type: 'lock',
          target: 'enemy',
          value: OVR, // Lock card and lose power equal to target's power
          duration: 1,
        };

      case 'Limited':
        // Limited cards get two specific effects based on their dual rarity
        // For now, return a special type that will be handled in applyAbilityEffect
        return {
          type: 'limited',
          target: 'enemy',
          value: 25,
          duration: 1,
        };

      default:
        return null;
    }
  }

  // Apply ability effect
  static applyAbilityEffect(
    ability: AbilityEffect,
    sourceCard: Card,
    targetCard?: Card,
    currentPlayerHealth?: number,
    setCurrentPlayerHealth?: (health: number) => void,
    opponentHealth?: number,
    setOpponentHealth?: (health: number) => void
  ): boolean {
    if (!ability) return false;

    switch (ability.type) {
      case 'weaken':
        if (targetCard && ability.target === 'enemy') {
          // Reduce target card's power by 25%
          const reduction = Math.floor(targetCard.OVR * 0.25);
          targetCard.powerModifier = (targetCard.powerModifier || 0) - reduction;
          return true;
        }
        break;

      case 'powerToHealth':
        if (ability.target === 'self' && currentPlayerHealth !== undefined && setCurrentPlayerHealth) {
          // Add 50% of power to current player's life points
          const healthBoost = Math.floor(sourceCard.OVR * 0.5);
          setCurrentPlayerHealth(currentPlayerHealth + healthBoost);
          return true;
        }
        break;

      case 'directDamage':
        if (ability.target === 'enemy' && opponentHealth !== undefined && setOpponentHealth) {
          // Deal 20% of power as direct damage to opponent
          const damage = Math.floor(sourceCard.OVR * 0.2);
          setOpponentHealth(Math.max(0, opponentHealth - damage));
          return true;
        }
        break;

      case 'increasePower':
        if (targetCard && ability.target === 'ally') {
          // Increase target card's power by 50%
          const powerBoost = Math.floor(targetCard.OVR * 0.5);
          targetCard.powerModifier = (targetCard.powerModifier || 0) + powerBoost;
          return true;
        }
        break;

      case 'lock':
        if (targetCard && ability.target === 'enemy') {
          // Lock target card and reduce source card power
          targetCard.isLocked = true;
          const powerReduction = targetCard.OVR;
          sourceCard.powerModifier = (sourceCard.powerModifier || 0) - powerReduction;
          return true;
        }
        break;

      case 'limited': {
        // Limited cards apply two specific effects based on their dual rarity
        // Get the two rarity colors from the card's border and map them to abilities
        const rarityColors = ['#9CA3AF', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];
        const rarityNames = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Limited'];

        // Extract colors from the card's border (this is a simplified approach)
        // In a real implementation, we'd store the dual rarity info in the card object
        const hash = sourceCard.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const rarity1Index = hash % (rarityColors.length - 1); // Exclude Limited
        const rarity2Index = (hash * 1.618) % (rarityColors.length - 1);

        const rarity1 = rarityNames[rarity1Index];
        const rarity2 = rarityNames[rarity2Index];

        // Map rarities to ability types
        const getAbilityFromRarity = (rarity: string): AbilityEffect['type'] => {
          switch (rarity) {
            case 'Common': return 'weaken';
            case 'Uncommon': return 'powerToHealth';
            case 'Rare': return 'directDamage';
            case 'Epic': return 'increasePower';
            case 'Legendary': return 'lock';
            default: return 'weaken';
          }
        };

        const effect1 = getAbilityFromRarity(rarity1);
        const effect2 = getAbilityFromRarity(rarity2);

        // Apply first effect
        const ability1: AbilityEffect = {
          type: effect1,
          target: effect1 === 'directDamage' ? 'enemy' : (effect1 === 'powerToHealth' ? 'self' : 'ally'),
          value: 25,
          duration: 1,
        };

        const success1 = this.applyAbilityEffect(ability1, sourceCard, targetCard, currentPlayerHealth, setCurrentPlayerHealth, opponentHealth, setOpponentHealth);

        // Apply second effect (different target if possible)
        let secondTargetCard: Card | undefined = targetCard;
        if (effect2 === 'powerToHealth') {
          secondTargetCard = sourceCard; // Self-targeting effect
        } else if (effect2 === 'directDamage') {
          secondTargetCard = undefined; // Direct damage to opponent
        } else if (effect2 === 'increasePower' || effect2 === 'weaken') {
          // Try to find a different ally target for variety
          const otherAllies = sourceCard ? [sourceCard] : []; // Fallback to self if no other allies
          secondTargetCard = otherAllies[Math.floor(Math.random() * otherAllies.length)];
        }

        const ability2: AbilityEffect = {
          type: effect2,
          target: effect2 === 'directDamage' ? 'enemy' : (effect2 === 'powerToHealth' ? 'self' : 'ally'),
          value: 25,
          duration: 1,
        };

        const success2 = this.applyAbilityEffect(ability2, sourceCard, secondTargetCard, currentPlayerHealth, setCurrentPlayerHealth, opponentHealth, setOpponentHealth);

        return success1 || success2;
      }
    }

    return false;
  }

  // Check if direct damage can be applied (no enemy cards defending or all are locked)
  static canApplyDirectDamage(enemyField: Card[]): boolean {
    // Direct attack is possible if there are no enemy cards or all are locked
    if (enemyField.length === 0) return true;
    return enemyField.every(card => card.isLocked);
  }

  // Get combat preview (what would happen if cards fought)
  static getCombatPreview(attacker: Card, defender: Card): {
    damage: number;
    categoryMultiplier: number;
    advantage: 'strong' | 'resistant' | 'neutral';
    description: string;
  } {
    const result = this.calculateDamage(attacker, defender);

    let advantage: 'strong' | 'resistant' | 'neutral' = 'neutral';
    let description = '';

    if (attacker.strongAgainst === defender.sector) {
      advantage = 'strong';
      description = `${getSectorName(attacker.sector)} is strong against ${getSectorName(defender.sector)}`;
    } else if (defender.resistantTo === attacker.sector) {
      advantage = 'resistant';
      description = `${getSectorName(defender.sector)} resists ${getSectorName(attacker.sector)}`;
    } else {
      description = 'No sector advantage';
    }

    return {
      damage: result.damage,
      categoryMultiplier: result.categoryMultiplier,
      advantage,
      description,
    };
  }

  // Process all abilities for cards that were just played with detailed logging
  static processCardAbilities(
    playedCards: Card[],
    playerField: Card[],
    enemyField: Card[],
    playerHealth: number,
    setPlayerHealth: (health: number) => void,
    pendingAbility?: {
      sourceCardId: string;
      abilityType: AbilityEffect['type'];
      targetType: 'ally' | 'enemy';
      validTargetIds: string[];
    }
  ): Array<{
    sourceCard: Card;
    ability: AbilityEffect;
    targetCard?: Card;
    description: string;
    oldValue?: number;
    newValue?: number;
    animationType: string;
  }> {
    const abilityResults = [];

    playedCards.forEach(card => {
      const ability = this.getCardAbility(card);
      if (ability) {
        if (ability.type === 'limited') {
          // Handle Limited cards with two specific effects based on their dual rarity
          const rarityColors = ['#9CA3AF', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];
          const rarityNames = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Limited'];

          // Extract colors from the card's border (this is a simplified approach)
          const hash = card.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const rarity1Index = hash % (rarityColors.length - 1); // Exclude Limited
          const rarity2Index = (hash * 1.618) % (rarityColors.length - 1);

          const rarity1 = rarityNames[rarity1Index];
          const rarity2 = rarityNames[rarity2Index];

          // Map rarities to ability types
          const getAbilityFromRarity = (rarity: string): AbilityEffect['type'] => {
            switch (rarity) {
              case 'Common': return 'weaken';
              case 'Uncommon': return 'powerToHealth';
              case 'Rare': return 'directDamage';
              case 'Epic': return 'increasePower';
              case 'Legendary': return 'lock';
              default: return 'weaken';
            }
          };

          const effect1 = getAbilityFromRarity(rarity1);
          const effect2 = getAbilityFromRarity(rarity2);

          // Apply first effect
          const ability1: AbilityEffect = {
            type: effect1,
            target: effect1 === 'directDamage' ? 'enemy' : (effect1 === 'powerToHealth' ? 'self' : 'ally'),
            value: 25,
            duration: 1,
          };

          let targetCard1: Card | undefined;
          switch (ability1.target) {
            case 'enemy':
              targetCard1 = enemyField[Math.floor(Math.random() * enemyField.length)];
              break;
            case 'ally':
              const otherAllies1 = playerField.filter(c => c.id !== card.id);
              targetCard1 = otherAllies1[Math.floor(Math.random() * otherAllies1.length)];
              break;
            case 'self':
              targetCard1 = card;
              break;
          }

          // Store old values for first effect
          let oldValue1: number | undefined;
          let newValue1: number | undefined;

          if (targetCard1) {
            if (ability1.type === 'weaken' || ability1.type === 'increasePower') {
              oldValue1 = targetCard1.powerModifier || 0;
            } else if (ability1.type === 'powerToHealth') {
              oldValue1 = targetCard1.currentHealth;
            }
          } else if (ability1.type === 'directDamage') {
            oldValue1 = playerHealth;
          }

          const success1 = this.applyAbilityEffect(ability1, card, targetCard1, playerHealth, setPlayerHealth);

          if (success1) {
            // Calculate new values after first effect
            if (targetCard1) {
              if (ability1.type === 'weaken' || ability1.type === 'increasePower') {
                newValue1 = targetCard1.powerModifier || 0;
              } else if (ability1.type === 'powerToHealth') {
                newValue1 = targetCard1.currentHealth;
              }
            } else if (ability1.type === 'directDamage') {
              newValue1 = Math.max(0, playerHealth);
            }

            // Create description for first effect
            let description1 = '';
            let animationType1 = '';

            switch (ability1.type) {
              case 'weaken':
                description1 = `${card.name} weakens ${targetCard1?.name} by ${ability1.value}%!`;
                animationType1 = 'weaken';
                break;
              case 'powerToHealth':
                const healthBoost1 = Math.floor(card.OVR * 0.5);
                description1 = `${card.name} converts ${healthBoost1} power to life points!`;
                animationType1 = 'heal';
                break;
              case 'directDamage':
                const damage1 = Math.floor(card.OVR * 0.2);
                description1 = `${card.name} deals ${damage1} direct damage to opponent!`;
                animationType1 = 'directDamage';
                break;
              case 'increasePower':
                const powerBoost1 = Math.floor((targetCard1?.OVR || 0) * 0.5);
                description1 = `${card.name} boosts ${targetCard1?.name} by ${powerBoost1} power!`;
                animationType1 = 'powerBoost';
                break;
              case 'lock':
                description1 = `${card.name} locks ${targetCard1?.name} and loses ${targetCard1?.OVR} power!`;
                animationType1 = 'lock';
                break;
            }

            abilityResults.push({
              sourceCard: card,
              ability: ability1,
              targetCard: targetCard1,
              description: description1,
              oldValue: oldValue1,
              newValue: newValue1,
              animationType: animationType1
            });
          }

          // Apply second effect
          const ability2: AbilityEffect = {
            type: effect2,
            target: effect2 === 'directDamage' ? 'enemy' : (effect2 === 'powerToHealth' ? 'self' : 'ally'),
            value: 25,
            duration: 1,
          };

          let targetCard2: Card | undefined;
          switch (ability2.target) {
            case 'enemy':
              targetCard2 = enemyField[Math.floor(Math.random() * enemyField.length)];
              break;
            case 'ally':
              const otherAllies2 = playerField.filter(c => c.id !== card.id);
              targetCard2 = otherAllies2[Math.floor(Math.random() * otherAllies2.length)];
              break;
            case 'self':
              targetCard2 = card;
              break;
          }

          // Store old values for second effect
          let oldValue2: number | undefined;
          let newValue2: number | undefined;

          if (targetCard2) {
            if (ability2.type === 'weaken' || ability2.type === 'increasePower') {
              oldValue2 = targetCard2.powerModifier || 0;
            } else if (ability2.type === 'powerToHealth') {
              oldValue2 = targetCard2.currentHealth;
            }
          } else if (ability2.type === 'directDamage') {
            oldValue2 = playerHealth;
          }

          const success2 = this.applyAbilityEffect(ability2, card, targetCard2, playerHealth, setPlayerHealth);

          if (success2) {
            // Calculate new values after second effect
            if (targetCard2) {
              if (ability2.type === 'weaken' || ability2.type === 'increasePower') {
                newValue2 = targetCard2.powerModifier || 0;
              } else if (ability2.type === 'powerToHealth') {
                newValue2 = targetCard2.currentHealth;
              }
            } else if (ability2.type === 'directDamage') {
              newValue2 = Math.max(0, playerHealth);
            }

            // Create description for second effect
            let description2 = '';
            let animationType2 = '';

            switch (ability2.type) {
              case 'weaken':
                description2 = `${card.name} weakens ${targetCard2?.name} by ${ability2.value}%!`;
                animationType2 = 'weaken';
                break;
              case 'powerToHealth':
                const healthBoost2 = Math.floor(card.OVR * 0.5);
                description2 = `${card.name} converts ${healthBoost2} power to life points!`;
                animationType2 = 'heal';
                break;
              case 'directDamage':
                const damage2 = Math.floor(card.OVR * 0.2);
                description2 = `${card.name} deals ${damage2} direct damage to opponent!`;
                animationType2 = 'directDamage';
                break;
              case 'increasePower':
                const powerBoost2 = Math.floor((targetCard2?.OVR || 0) * 0.5);
                description2 = `${card.name} boosts ${targetCard2?.name} by ${powerBoost2} power!`;
                animationType2 = 'powerBoost';
                break;
              case 'lock':
                description2 = `${card.name} locks ${targetCard2?.name} and loses ${targetCard2?.OVR} power!`;
                animationType2 = 'lock';
                break;
            }

            abilityResults.push({
              sourceCard: card,
              ability: ability2,
              targetCard: targetCard2,
              description: description2,
              oldValue: oldValue2,
              newValue: newValue2,
              animationType: animationType2
            });
          }
        } else {
          // Handle non-limited cards normally
          let targetCard: Card | undefined;

          // Check if there's a pending ability for this card
          if (pendingAbility && pendingAbility.sourceCardId === card.id) {
            // Use manual targeting
            if (pendingAbility.targetType === 'enemy') {
              targetCard = enemyField.find(c => c.id === pendingAbility.validTargetIds[0]); // The valid target ID is the selected one
            } else if (pendingAbility.targetType === 'ally') {
              targetCard = playerField.find(c => c.id === pendingAbility.validTargetIds[0]);
            }
          } else {
            // Use random targeting for AI or when no manual target is selected
            switch (ability.target) {
              case 'enemy':
                // Target random enemy card
                targetCard = enemyField[Math.floor(Math.random() * enemyField.length)];
                break;
              case 'ally':
                // Target random ally card (excluding self)
                const otherAllies = playerField.filter(c => c.id !== card.id);
                targetCard = otherAllies[Math.floor(Math.random() * otherAllies.length)];
                break;
              case 'self':
                targetCard = card;
                break;
            }
          }

          // Store old values for animation
          let oldValue: number | undefined;
          let newValue: number | undefined;

          if (targetCard) {
            if (ability.type === 'weaken' || ability.type === 'increasePower') {
              oldValue = targetCard.powerModifier || 0;
            } else if (ability.type === 'powerToHealth') {
              oldValue = targetCard.currentHealth;
            }
          } else if (ability.type === 'directDamage') {
            oldValue = playerHealth;
          }

          // Apply the ability
          const success = this.applyAbilityEffect(ability, card, targetCard, playerHealth, setPlayerHealth);

          if (success) {
            // Calculate new values after ability
            if (targetCard) {
              if (ability.type === 'weaken' || ability.type === 'increasePower') {
                newValue = targetCard.powerModifier || 0;
              } else if (ability.type === 'powerToHealth') {
                newValue = targetCard.currentHealth;
              }
            } else if (ability.type === 'directDamage') {
              newValue = Math.max(0, playerHealth); // This will be updated by setPlayerHealth
            }

            // Create detailed description
            let description = '';
            let animationType = '';

            switch (ability.type) {
              case 'weaken':
                description = `${card.name} weakens ${targetCard?.name} by ${ability.value}%!`;
                animationType = 'weaken';
                break;
              case 'powerToHealth':
                const healthBoost = Math.floor(card.OVR * 0.5);
                description = `${card.name} converts ${healthBoost} power to life points!`;
                animationType = 'heal';
                break;
              case 'directDamage':
                const damage = Math.floor(card.OVR * 0.2);
                description = `${card.name} deals ${damage} direct damage to opponent!`;
                animationType = 'directDamage';
                break;
              case 'increasePower':
                const powerBoost = Math.floor((targetCard?.OVR || 0) * 0.5);
                description = `${card.name} boosts ${targetCard?.name} by ${powerBoost} power!`;
                animationType = 'powerBoost';
                break;
              case 'lock':
                description = `${card.name} locks ${targetCard?.name} and loses ${targetCard?.OVR} power!`;
                animationType = 'lock';
                break;
            }

            abilityResults.push({
              sourceCard: card,
              ability,
              targetCard,
              description,
              oldValue,
              newValue,
              animationType
            });
          }
        }
      }
    });

    return abilityResults;
  }
}
