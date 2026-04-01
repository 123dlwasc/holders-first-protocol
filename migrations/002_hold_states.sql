-- Holders First Protocol - Hold States Table (exact match for new indexer.js)
-- Run this ONCE. It creates the table with all columns the indexer now writes.

CREATE TABLE IF NOT EXISTS hold_states (
    wallet_address      TEXT NOT NULL,
    mint_address        TEXT NOT NULL,
    current_balance     TEXT NOT NULL,           -- raw integer as string (BigInt safe)
    last_buy_blocktime  INTEGER,                 -- unix timestamp when current hold started
    accrued_hold_seconds INTEGER DEFAULT 0,
    last_updated_slot   INTEGER NOT NULL,        -- unix timestamp (MVP proxy for slot)
    mint_total_supply   TEXT NOT NULL,
    dust_threshold      TEXT NOT NULL,
    
    PRIMARY KEY (wallet_address, mint_address)
);

-- Indexes for fast lookups (quality score + Merkle builds)
CREATE INDEX IF NOT EXISTS idx_hold_states_wallet ON hold_states(wallet_address);
CREATE INDEX IF NOT EXISTS idx_hold_states_mint ON hold_states(mint_address);
CREATE INDEX IF NOT EXISTS idx_hold_states_last_buy ON hold_states(last_buy_blocktime);

PRAGMA table_info(hold_states);  -- quick verification when you run it
