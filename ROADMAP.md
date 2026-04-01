# Roadmap

**Current Phase: Foundation Complete (v0.2)**

The core Reputation Oracle is now live and stable.

### Delivered
- Stateful hold duration indexer (`indexer.js`) with accurate buy/sell/dust logic and 0.0001% supply threshold
- Merkle-rooted on-chain Oracle PDA with successful root updates on devnet
- Quality Score v0.2 formula (gradual time ramp + strong supplyFactor + mild mcapFactor + hard 8× global cap)
- Clean, production-ready scripts with consistent logging and error handling
- Full end-to-end pipeline: indexer → SQLite → Merkle root → lookup

The polling foundation is trustworthy and ready for real wallets.

### Immediate Next Steps (Next 1-2 weeks)
- Real-time updater via Helius webhooks (already prototyped — make it the primary path)
- On-chain Merkle proof verification + permissionless self-claim instruction
- Basic integration tests and improved error resilience
- Update Anchor program skeleton to expose clean CPI interface

### Phase 1 – Certification & Rewards
- Token Certification flow for existing memecoins
- Time-weighted holder rewards from protocol fees
- Loyalty Badges (NFT layer on top of Quality Scores)

### Phase 2 – Fair Launch Primitive
- Optional $100k MCAP fixed-price escrow launch mechanism
- Refundable votes + anti-sniper mechanics
- Pro-rata distribution for true holders

### Phase 3 – Ecosystem Primitive
- Public Reputation Oracle (easy CPI access for any launcher or dApp)
- Governance for adjusting multipliers and parameters
- “Big-bag” multiplier for top holders

**Status (April 2026):**  
Foundation is solid. Solo development for now — fully open to serious collaborators and PRs who want to help ship the real-time layer and on-chain verification.

The original vision remains unchanged: build a holders-first world where conviction is measurable, rewarded, and respected.