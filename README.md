# Holders-First Protocol — Solana Memecoin Standards Proposal (v0.1)

**An open, additive on-chain layer for any launcher.**

No replacement. No extra fees. This is a protocol that plugs into existing launchers and adds quality scores, loyalty badges, fair launches, and real holder rewards.

## Mission
Fix the 2026 trenches: rugs, snipers, flipper rewards, holder punishment. Reward believers over traders. Give communities on-chain proof of conviction.

## Current Status - MVP Achieved (March 2026)
- On-chain Quality PDA live on devnet (Program ID: `FZwjvmECrnwu1zdB675UXwsDs9CLm9oieckDBB9EULNR`).
- Off-chain indexer working: pulls real Helius data, calculates exact formula from README, generates Merkle root.
- Real MCAP lookup via DexScreener.
- Basic hold duration calculation.
- Score can be written to the PDA on devnet.

## Core Mechanics

### 1. Quality Score
Exact formula:
QualityScore = (0.4 × MCAPFactor) + (0.4 × DurationFactor) + (0.2 × BackerFactor)

- MCAPFactor = 1 if token reached ≥ $100k MCAP
- DurationFactor = 1 if held ≥ 30 days (current continuous hold)
- BackerFactor = average backer quality (placeholder for MVP)

### 2. On-chain PDA
Stores owner, score, bump. Supports initialize and update.

### 3. Indexer (off-chain)
Command-line tool:
```bash    
node indexer.js <wallet_address>
```

## Next Steps (solo-dev)

- Improve hold-duration accuracy with full sell/buy detection
- Real backer quality recursive logic
- Full Merkle proof verification on-chain
- Basic frontend for score lookup

Open to PRs and feedback.
@stoner_broke | DMs open.
