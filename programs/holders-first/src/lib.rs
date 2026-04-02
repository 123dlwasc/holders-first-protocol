#![allow(unexpected_cfgs)]   // Suppress noisy Anchor/Solana cfg warnings (common with 0.32)

use anchor_lang::prelude::*;

declare_id!("FZwjvmECrnwu1zdB675UXwsDs9CLm9oieckDBB9EULNR");

#[program]
pub mod holders_first {
    use super::*;

    /// Initialize the Oracle PDA (call this once)
    pub fn initialize_oracle(ctx: Context<InitializeOracle>) -> Result<()> {
        let oracle = &mut ctx.accounts.oracle;
        oracle.authority = ctx.accounts.authority.key();
        oracle.root = [0u8; 32];        // zero root initially
        oracle.last_slot = 0;
        Ok(())
    }

    /// Update the Merkle root with new hold states
    /// Called by update-oracle.js
    pub fn update_oracle_root(ctx: Context<UpdateOracleRoot>, new_root: [u8; 32], slot: u64) -> Result<()> {
        let oracle = &mut ctx.accounts.oracle;

        // Only the authority can update the root
        require_keys_eq!(
            oracle.authority,
            ctx.accounts.authority.key(),
            ErrorCode::Unauthorized
        );

        oracle.root = new_root;
        oracle.last_slot = slot;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeOracle<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 8,   // discriminator + authority + root + last_slot
        seeds = [b"oracle_root"],
        bump
    )]
    pub oracle: Account<'info, OracleRoot>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateOracleRoot<'info> {
    #[account(
        mut,
        seeds = [b"oracle_root"],
        bump
    )]
    pub oracle: Account<'info, OracleRoot>,

    pub authority: Signer<'info>,
}

#[account]
pub struct OracleRoot {
    pub authority: Pubkey,      // who is allowed to update the root
    pub root: [u8; 32],         // Merkle root of all hold states
    pub last_slot: u64,         // slot when root was last updated
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized - only the authority can update the oracle")]
    Unauthorized,
}