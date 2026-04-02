# Holders-First Protocol

Additive on-chain reputation oracle for Solana tokens.

It tracks long-term holding behavior and computes a Quality Score based on hold duration, percentage of supply owned, and market cap tier. The score is heavily time-weighted.

### Quality Score

```math
Quality Score = (accruedDays × 55 + 65) × timeMultiplier × supplyFactor × mcapFactor
```

with a hard global 8× cap.

- **timeMultiplier**: Gradual ramp from 1.0× to 4.0× based on hold days
- **supplyFactor**: Strong boost up to 2.8× for larger ownership percentage
- **mcapFactor**: Mild bonus up to 1.45× for higher market cap tokens

### Hold Duration Logic

Persistent per-(wallet, mint) state machine in SQLite.

- Balance crosses dust threshold (0.0001% of supply) from below → start hold clock
- Balance drops below dust → accrue time and reset clock
- While above dust → time accrues continuously

This correctly handles partial sells, dust positions, and ATA closures.

### Current Implementation

- Hybrid real-time hold state tracker (webhook + polling) with buy/sell/dust logic
- Quality score calculation engine
- On-chain Merkle-rooted Oracle PDA (deployed on devnet, program ID `FZwjvmECrnwu1zdB675UXwsDs9CLm9oieckDBB9EULNR`)
- Wallet-level and per-token lookup tools

All core components are functional and tested on devnet.

### Prerequisites

- Node.js 18+
- Anchor framework installed
- Solana CLI
- Helius API key (set in `.env`)

### How to Run & Test

```bash
# Real-time updater (recommended)
node real-time-updater.js <wallet_address>

# Manual indexing (fallback)
npm run indexer -- <wallet_address>

# Quality score lookup
npm run lookup -- <wallet_address>

# Full pipeline test
npm run pipeline -- <wallet_address>
```

To test the real-time updater:
1. Start `node real-time-updater.js <wallet_address>`
2. Send any token to the wallet
3. Watch the terminal for balance updates and accrual logs

### Design Principles

- Additive only: works alongside existing launchers without extra fees
- CPI-friendly: designed for easy integration by other Solana programs
- Permissionless: Merkle-rooted data for on-chain verification

### Technical Details

- SQLite database with state machine for hold tracking
- Anchor program with `OracleRoot` PDA and `update_oracle_root` instruction
- Hybrid real-time layer (webhooks + 8-second polling)

### Current Limitations

- Single wallet support only (multi-wallet support planned)
- On-chain Merkle proof verification not yet implemented
- Stability and error handling improvements ongoing

Serious contributions and feedback welcome. Early-stage infrastructure project.