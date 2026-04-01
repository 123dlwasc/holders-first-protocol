# Holders-First Protocol

**Additive on-chain Reputation Oracle for Solana memecoins.**

No launcher replacement. No extra fees. Plugs into any existing launcher via CPI and delivers verifiable conviction scoring, loyalty mechanics, and real holder rewards.

## Mission
Kill the 2026 meta of rugs, snipers, and flipper extraction. Replace it with transparent on-chain proof of conviction that rewards long-term believers and builds sustainable communities.

## Core Primitive: Reputation Oracle
A permissionless on-chain oracle that scores wallets based on real skin-in-the-game. Any Solana program can consume Quality Scores through simple CPI.

### Quality Score (v0.2) — Stable
```math
QualityScore = (accruedDays × 55 + 65) × timeMultiplier × supplyFactor × mcapFactor
```
Hard-capped at 8× global maximum.

- **TimeMultiplier** (dominant, gradual ramp)
  - < 3 days → 1.0×
  - 3–7 days → 1.5×
  - 7–14 days → 2.0×
  - 14–30 days → 2.5×
  - 30–60 days → 3.0×
  - 60+ days → 4.0×
- **supplyFactor** (strong % of supply owned)
  - > 0.5% → 2.8×
  - > 0.1% → 2.0×
  - > 0.01% → 1.5×
  - else → 1.0×
- **mcapFactor** (mild luxury bonus)
  - > $10M → 1.45×
  - > $5M → 1.25×
  - > $2M → 1.1×
  - else → 1.0×

Final wallet score = average per-token score + small multi-token bonus.

### Hold Duration Logic (Stateful & Accurate)
The system maintains a persistent per-(wallet, mint) state machine in SQLite.

On every balance change:
- Balance crosses dust threshold (0.0001% of total supply) from below → BUY event, start current hold clock.
- Balance drops below dust threshold → SELL event, accrue time to `accrued_hold_seconds`.
- While above dust → time accrues continuously.

This correctly handles partial sells, dust, and ATA closures without historical rescans.

## Current Implementation
- **Polling Indexer** (`indexer.js`) – Helius `getTokenAccountsByOwner` + transparent state updates.
- **Merkle Oracle** (`update-oracle.js`) – Pushes root of all hold states to on-chain PDA.
- **Quality Score Lookup** (`lookup.js`) – Reads DB and returns clean JSON score + per-token details.
- Devnet-ready Anchor program skeleton.

All core scripts are now cleaned, error-handled, and production-like.

## How to Run the Pipeline

```bash
# 1. Update hold states for a wallet
node indexer.js <wallet_address> [--verbose]

# 2. Push Merkle root to on-chain Oracle
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com node update-oracle.js

# 3. Lookup quality score
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com node lookup.js <wallet_address>
```

## Next Steps (in order)
1. Real-time updater (Helius webhooks) – already prototyped, will become primary path.
2. On-chain Merkle proof verification + permissionless self-claim.
3. Loyalty badges (NFT layer on top of scores).
4. Time-weighted holder rewards from protocol fees.
5. Optional $100k MCAP fair-launch escrow primitive.

## Repository Status (April 2026)
Foundation complete. The polling pipeline is stable, trustworthy, and ready for real use. 

Open to serious PRs and collaborators only.

**@stoner_broke** | DMs open.

Built with conviction.