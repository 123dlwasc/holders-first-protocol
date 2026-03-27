# Roadmap

**Current Phase: Foundation (v0.2)**

Building the core Reputation Oracle primitive with accurate, stateful hold duration tracking and graduated TimeMultiplier.

- Anchor program skeleton + full project structure pushed
- Indexer foundation in place (`indexer.js` with Helius parsing)
- Quality Score formula + Hold Duration logic fully specified and locked in README
- Vision, economic model, and on-chain design documented

**Next Steps (Immediate Priority - Next 1-3 weeks)**

- [ ] Implement stateful hold duration indexer (batch polling MVP + Helius webhook-ready architecture, 0.0001% supply dust threshold, graduated multiplier)
- [ ] Design and implement on-chain Reputation Oracle PDA layout (Merkle root of per-(wallet, mint) hold data: current_hold_seconds, accrued_hold_seconds, time_multiplier)
- [ ] Build permissionless self-claim instruction for hold proof verification
- [ ] Implement full Merkle proof verification on-chain
- [ ] Add recursive BackerFactor logic to indexer + on-chain
- [ ] Basic frontend for Quality Score lookup and token certification

**Future Phases**

**Phase 1 – Certification & Rewards**
- Token Certification flow for existing memecoins
- Holder rewards distribution (time-weighted from protocol fees)
- Loyalty Badges (permanent on-chain)

**Phase 2 – Fair Launch Escrow**
- Optional fixed $100k MCAP countdown escrow launch mechanism
- Pro-rata distribution + anti-sniper mechanics

**Phase 3 – Ecosystem Primitive**
- Public Reputation Oracle (easy CPI access for any launcher/dApp)
- Governance for parameter adjustments
- Big-bag multiplier (top 5% holder boost)

**Status:** Solo development – fully open to serious PRs and collaborators.