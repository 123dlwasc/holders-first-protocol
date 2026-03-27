# Holders-First Protocol

**Additive on-chain Reputation Oracle for Solana memecoins.**

No launcher replacement. No extra fees. Plugs into any existing launcher via CPI and delivers verifiable conviction scoring, loyalty mechanics, and real holder rewards.

## Mission
Kill the 2026 meta of rugs, snipers, and flipper extraction. Replace it with transparent on-chain proof of conviction that rewards long-term believers and builds sustainable communities.

## Core Primitive: Reputation Oracle
A permissionless on-chain oracle that scores wallets based on real skin-in-the-game. Any Solana program can consume Quality Scores through simple CPI.

### Quality Score (v0.2)

```math
QualityScore = (0.4 \times MCAPFactor) + (0.4 \times TimeMultiplier) + (0.2 \times BackerFactor)
```

- **MCAPFactor** = 1.0 if the token has reached ≥ $100k market cap  
- **TimeMultiplier** = graduated hold duration multiplier (see below)  
- **BackerFactor** = recursive average quality of previous successful backers

### Hold Duration Logic (Stateful & Real-Time)
The indexer maintains a persistent per-(wallet, mint) state machine (Helius batch polling for MVP, webhooks for production).

On every balance-changing transaction:
- Balance rises from 0 → start current hold clock (`last_buy_blocktime = now`)
- Balance drops **below 0.0001% of total supply** → treat as full sell: accrue elapsed time to `accrued_hold_seconds`, reset current clock
- Partial moves above threshold → hold clock continues uninterrupted

This eliminates historical re-scans, correctly handles dust/partial sells/ATA closures, and provides accurate long-term conviction signals.

**TimeMultiplier**
```math
effective_days = (current_hold_seconds + 0.3 \times accrued_hold_seconds) / 86400

time_multiplier = 1.0 + \min(2.0, \max(0.0, (effective_days - 7) / 23 \times 2.0))
```

- < 7 days: 1.0x  
- 7–30 days: linear ramp to 3.0x  
- 30+ days: capped at 3.0x

## On-Chain Implementation
Merkle-rooted PDA storing verified Quality Score and per-token hold data. Supports updates and future permissionless self-claim verification for maximum robustness.

## Planned Features
- Permanent Loyalty Badges for proven early + long-term holders
- Time-weighted holder rewards funded by protocol fees
- Optional Fair Launch Escrow ($100k MCAP fixed-price countdown)
- Token Certification for existing memecoins

## Current Status (March 2026)
- Full Anchor project structure and documentation pushed
- Indexer foundation (`indexer.js`) with Helius integration started
- Hold duration logic, Quality Score formula, and oracle design fully locked
- Preparing for first devnet deployment of the Reputation Oracle

Still early foundation phase.

## Next Steps
- Stateful indexer (batch polling → webhook-ready)
- On-chain PDA layout + Merkle proof verification
- Recursive BackerFactor logic
- Basic frontend for score lookup and certification

Open to serious PRs and collaborators only.

**@stoner_broke** | DMs open for builders.

Built with conviction.