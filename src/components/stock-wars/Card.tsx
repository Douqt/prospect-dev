'use client';

import React from 'react';
import { Card as CardType, Rarity } from '@/types/card-game';
import { getRarityColor } from '@/lib/card-game/game-utils';
import { Badge } from '@/components/ui/badge';

interface CardProps {
  card: CardType;
  isPlayable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  showStats?: boolean;
  className?: string;
}

export function Card({
  card,
  isPlayable = false,
  isSelected = false,
  onClick,
  showStats = true,
  className = ''
}: CardProps) {
  const rarityColor = getRarityColor(card.rarity);

  // Format numbers for display
  const formatNumber = (num: number) => {
    if (num >= 1000000000000) return '$' + (num / 1000000000000).toFixed(1) + 'T';
    if (num >= 1000000000) return '$' + (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatPrice = (num: number) => {
    return '$' + num.toFixed(2);
  };

  // Get rarity display info
  const getRarityInfo = (rarity: Rarity) => {
    const rarityMap = {
      Common: { name: 'COMMON', color: '#9CA3AF', icon: '⚪' },
      Uncommon: { name: 'UNCOMMON', color: '#10B981', icon: '🟢' },
      Rare: { name: 'RARE', color: '#3B82F6', icon: '🔵' },
      Epic: { name: 'EPIC', color: '#8B5CF6', icon: '🟣' },
      Legendary: { name: 'LEGENDARY', color: '#F59E0B', icon: '🟡' },
      Limited: { name: 'LIMITED', color: '#EF4444', icon: '🔴' }
    };
    return rarityMap[rarity];
  };

  const rarityInfo = getRarityInfo(card.rarity);

  // Get dual colors for Limited cards (memoized to prevent hydration issues)
  const limitedColors = React.useMemo(() => {
    if (card.rarity !== 'Limited') return null;
    
    const colors = ['#9CA3AF', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'];
    const availableColors = colors.filter(color => color !== rarityInfo.color);

    const hash = card.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const color1 = availableColors[hash % availableColors.length];

    const remainingColors = availableColors.filter(color => color !== color1);
    const color2 = remainingColors[Math.floor(hash * 1.618) % remainingColors.length];

    return { color1, color2 };
  }, [card.rarity, card.id, rarityInfo.color]);

  // Get ability text based on rarity
  const getAbilityText = (rarity: Rarity) => {
    const abilityMap = {
      Common: 'Weaken enemy by 25%',
      Uncommon: 'Convert 50% power to health',
      Rare: 'Deal 20% power as direct damage',
      Epic: 'Boost ally power by 50%',
      Legendary: 'Lock enemy, lose equal power',
      Limited: 'Two random effects'
    };
    return abilityMap[rarity];
  };

  // Render card content
  const renderCardContent = () => (
    <>
      {/* ----------  ROOT: 80×112 px canvas  ---------- */}
      <div className="absolute inset-0 w-full h-full flex flex-col">

        {/* 1.  BACKDROP  (kept for gradient) */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e293b 100%)`,
            zIndex: 1,
          }}
        />

        {/* 2.  HEADER – locked 20 px for two lines, never grows */}
        <div className="px-1.5 pt-1 relative z-10 shrink-0" style={{ height: '20px' }}>
          <div className="flex justify-between items-start h-full">
            <div className="flex-1 min-w-0 pr-1">
              <div
                className="text-white font-bold leading-tight"
                style={{ fontSize: '8px', wordBreak: 'break-word' }}
              >
                {card.name}
              </div>
              <div
                className="text-slate-300 leading-tight"
                style={{ fontSize: '6px', wordBreak: 'break-word' }}
              >
                {card.sector}
              </div>
            </div>
            <div className="text-right flex-shrink-0 relative">
              <div className="text-base font-bold text-white leading-none">
                {card.currentHealth + (card.powerModifier || 0)}
              </div>
              <div className="text-slate-300 leading-none" style={{ fontSize: '6px' }}>❤️</div>
            </div>
          </div>
        </div>

        {/* 3.  CHART  – 12 px high, no extra gap */}
        <div className="relative w-full shrink-0" style={{ height: '12px' }}>
          <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none" className="opacity-20">
            <path d="M0,30 Q25,20 50,10 T100,5" stroke={rarityInfo.color} strokeWidth="1.5" fill="none" />
            <path d="M0,35 Q30,25 60,20 T100,15" stroke={rarityInfo.color} strokeWidth="1" fill="none" />
          </svg>
        </div>

        {/* 4.  STATS  – compact 52 px panel */}
        <div
          className="mx-1 mb-0.5 relative z-10 shrink-0"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            border: `1px solid ${rarityInfo.color}60`,
            borderRadius: '3px',
          }}
        >
          <div className="px-1 py-0.5 space-y-px" style={{ fontSize: '6px' }}>
            <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">Price</span><span className="text-yellow-400 font-bold">{formatPrice(card.stats.price)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">Mkt Cap</span><span className="text-blue-400 font-bold">{formatNumber(card.stats.marketCap)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">Volume</span><span className="text-green-400 font-bold">{formatNumber(card.stats.volume)}</span></div>
            
          </div>
        </div>

        {/* 5.  ABILITY – 2-line cage, never grows */}
        <div className="mx-1 mb-0.5 relative z-10 shrink-0" style={{ height: '22px' }}>
          <div
            className="px-1 py-0.5 rounded-sm h-full overflow-hidden"
            style={{
              backgroundColor: `${rarityInfo.color}15`,
              border: `1px solid ${rarityInfo.color}40`,
              fontSize: '5.5px',
              lineHeight: '6px',   // exactly two lines
            }}
          >
            <div className="text-slate-300 leading-tight">{getAbilityText(card.rarity)}</div>
          </div>
        </div>

        {/* 6.  SECTOR ADVANTAGES – same spot always */}
        <div className="mx-1 mb-0.5 relative z-10 shrink-0">
          <div
            className="flex justify-between items-center text-2xs font-bold leading-none"
            style={{ fontSize: '5px' }}
            title={`Strong vs: ${card.strongAgainst} | Weak vs: ${card.resistantTo}`}
          >
            <span className="text-green-400 truncate">▲ {card.strongAgainst}</span>
            <span className="text-red-400 truncate">▼ {card.resistantTo}</span>
          </div>
        </div>

        {/* 7.  LOCK / COST  overlays */}
        {card.isLocked && (
          <div className="absolute inset-0 bg-slate-900 bg-opacity-70 flex items-center justify-center rounded-lg z-20">
            <div className="text-white font-bold text-xs">🔒 LOCKED</div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className={`relative ${className}`}>
      {/* 1.  VISUAL wrapper – rounded, bordered, scales on hover *********/}
      <div
        className="w-20 h-28 rounded-lg border-2
                  transition-all duration-200 ease-in-out
                  hover:scale-105 hover:shadow-xl
                  group"                                    /* ← used for hover selector */
        style={{
          /* ======  STATIC border (shows at rest) ====================== */
          width: limitedColors ? '80px' : '80px',          // 80 + 1 px each side
          height: limitedColors ? '114px' : '112px',
          background: limitedColors
            ? `linear-gradient(135deg, ${limitedColors.color1} 0%, ${limitedColors.color1} 50%, ${limitedColors.color2} 50%, ${limitedColors.color2} 100%)`
            : undefined,
          padding: limitedColors ? '2px' : undefined,
          borderColor: !limitedColors && !isSelected ? rarityColor : undefined,
          boxShadow: isSelected
            ? `0 0 20px ${(limitedColors ? limitedColors.color1 : rarityColor)}80`
            : '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        {/* 2.  HOVER overlay (only visible on hover) **********************/}
        {/* <div
          className="absolute inset-0 rounded-lg
                    bg-gradient-to-br from-purple-500 to-pink-500
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-200 ease-in-out"
        /> */}

        {/* 3.  HIT-BOX – square, catches the click *************************/}
        <div
          className={`relative w-full h-full rounded-none
                    ${isSelected ? 'ring-2 ring-yellow-400' : ''}
                    ${card.isLocked ? 'opacity-60' : ''}
                    ${isPlayable && !limitedColors ? 'group-hover:border-green-400' : ''}`}
          onClick={onClick}
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e293b 100%)',
          }}
        >
          {renderCardContent()}
        </div>
      </div>
    </div>
  );
}
