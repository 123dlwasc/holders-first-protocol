# Roadmap

### Current Status (April 2026)
Foundation phase (v0.2) is complete.

**Delivered:**
- Hybrid real-time hold state tracker (Helius webhooks + polling) with accurate buy/sell/dust logic
- Quality Score v0.2 calculation (heavily time-weighted with supply and MCAP factors, hard 8× cap)
- On-chain Merkle-rooted Oracle PDA with `update_oracle_root` instruction (deployed on devnet)
- Clean indexing and lookup scripts with proper state machine logic
- End-to-end pipeline from state tracking to Merkle root updates

The core system is stable on devnet.

### Immediate Next Steps (Priority)
1. Improve real-time updater stability and add multi-wallet support
2. Implement on-chain Merkle proof verification + permissionless self-claim
3. Add comprehensive integration tests and better error handling
4. Expose clean CPI interface from the Anchor program

**Development Notes:**
- Currently single-wallet focused
- On-chain verification is the highest priority
- Solo development for now — open to serious collaborators on specific components

Serious PRs welcome.