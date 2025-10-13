-- Add a main_category column to discussions table
-- This will cleanly separate posts by asset type

ALTER TABLE discussions ADD COLUMN main_category TEXT NOT NULL DEFAULT 'stocks';

-- Add a check constraint for valid main categories
ALTER TABLE discussions
ADD CONSTRAINT discussions_main_category_check
CHECK (main_category IN ('stocks', 'crypto', 'futures'));

-- Now you can cleanly query by main category instead of excluding everything
-- Update existing posts based on their current category
UPDATE discussions SET main_category = 'crypto' WHERE category IN ('BTC', 'ETH', 'ADA', 'XRP', 'SOL', 'DOT', 'DOGE', 'AVAX', 'SHIB', 'MATIC', 'ICP', 'FIL', 'ETC', 'UNI', 'LINK', 'LTC', 'XLM', 'TRX', 'VET', 'THETA', 'FLOW', 'HBAR', 'CAKE', 'GRT', 'MANA', 'SAND', 'AXS', 'CHZ', 'ENJ', 'BAT', 'COMP', 'MKR', 'AAVE', 'SUSHI', 'YFI', 'BAL', 'REN', 'KNC', 'ZRX', 'STORJ', 'ANT', 'GNT', 'REP', 'OMG', 'BAT', 'SAN', 'NMR', 'WAVES', 'LSK', 'ARK', 'STRAT', 'XEM', 'BTG', 'ZEC', 'DASH', 'XMR', 'BTG', 'ZEC', 'DASH', 'QTUM', 'BTG', 'BTG');

UPDATE discussions SET main_category = 'futures' WHERE category IN ('ES', 'NQ', 'RTY', 'YM', 'CL', 'BZ', 'NG', 'RB', 'HO', 'GC', 'SI', 'HG', 'PL', 'PA', 'ZW', 'ZS', 'ZC', 'ZL', 'ZO', 'ZM', 'ZK', 'ZW', 'ZS', 'ZC', 'ZL', 'KE', 'MWE', 'MWZ', 'M6A', 'M6B', 'M6E', 'TN', 'JB', 'UB', 'FV', 'TY', 'US', 'FF', 'GE', 'GF', 'ZG', 'ZI', 'ZN', 'ZT', 'ZU', 'ZZ', 'AW', 'BO', 'SM', 'C', 'CT', 'DX', 'EC', 'JY', 'BP', 'AD', 'CD', 'SF', 'MP', 'FC', 'LC', 'LB', 'LN', 'KW');

-- Everything else defaults to 'stocks'
UPDATE discussions SET main_category = 'stocks' WHERE main_category = 'stocks';

-- Verify the updates
SELECT main_category, category, COUNT(*) as post_count
FROM discussions
GROUP BY main_category, category
ORDER BY main_category, category;

-- Final query example - now super clean!
-- SELECT * FROM discussions WHERE main_category = 'stocks' AND category = 'NVDA';
