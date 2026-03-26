# Holders-First Protocol — Solana Memecoin Standards Proposal (v0.1)

**An open, additive on-chain layer for any launcher (Pump.fun, Raydium, Bonk, Streamlock, etc.).**  
No replacement. No extra fees. This is a protocol that plugs into existing launchers and adds quality scores, loyalty badges, fair launches, and real holder rewards.

## Mission
Fix the 2026 trenches: rugs, snipers, flipper rewards, holder punishment. Reward believers over traders. Make the space positive again. Give communities on-chain proof of conviction and separate high-quality conviction from low-quality noise.

## Current Status - MVP Achieved (March 2026)
- On-chain Quality PDA live on devnet (Program ID: `FZwjvmECrnwu1zdB675UXwsDs9CLm9oieckDBB9EULNR`).
- Off-chain indexer working: pulls real Helius data, calculates exact formula, generates Merkle root.
- Score now uses real MCAP (DexScreener) and basic hold duration.
- Test file reliably writes the score to the PDA on devnet.

## Core Mechanics

### 1. Quality Score + Loyalty Badge (on-chain, Sybil-resistant)

Exact formula (0–100% score per wallet):

QualityScore = (0.4 × MCAPFactor) + (0.4 × DurationFactor) + (0.2 × BackerFactor)

- MCAPFactor = 1.0 if the wallet has held ≥1 token that reached $100k MCAP at any point.
- DurationFactor = 1.0 if the wallet has held ≥1 token for ≥30 days (current continuous hold after last full sell).
- BackerFactor = average QualityScore of the original backers (placeholder 0.85 for MVP).

### 2. On-chain PDA
- Stores owner, score, bump.
- `initialize_quality_pda` and `update_quality_score` instructions.

### 3. Indexer (off-chain)
- Command-line: `node indexer.js <wallet_address>`
- Uses Helius + DexScreener for real data.
- Generates Merkle root for on-chain verification.

## Next Steps
- Full Merkle proof verification on-chain
- Real backer quality recursive logic
- Improve hold-duration accuracy

Open to PRs and feedback. 

@stoner_broke | DMs open. Let’s make holding feel good again.
