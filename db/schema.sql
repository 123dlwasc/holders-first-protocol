CREATE TABLE IF NOT EXISTS hold_states (
    wallet_address      TEXT    NOT NULL,
    mint_address        TEXT    NOT NULL,
    current_balance     TEXT    NOT NULL DEFAULT '0',     -- u64 as string (precision)
    last_buy_blocktime  INTEGER,                            -- NULL if not holding
    accrued_hold_seconds INTEGER NOT NULL DEFAULT 0,
    last_updated_slot   INTEGER NOT NULL,
    mint_total_supply   TEXT    NOT NULL,                 -- cached once per mint
    dust_threshold      TEXT    NOT NULL,                 -- 0.0001% of supply
    PRIMARY KEY (wallet_address, mint_address)
);

CREATE INDEX IF NOT EXISTS idx_hold_wallet ON hold_states(wallet_address);
CREATE INDEX IF NOT EXISTS idx_hold_mint   ON hold_states(mint_address);

-- Helper table to avoid re-processing signatures
CREATE TABLE IF NOT EXISTS processed_signatures (
    signature TEXT PRIMARY KEY,
    slot      INTEGER NOT NULL,
    processed_at INTEGER NOT NULL
);