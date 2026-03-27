use anchor_lang::prelude::*;

declare_id!("FZwjvmECrnwu1zdB675UXwsDs9CLm9oieckDBB9EULNR");

#[program]
pub mod holders_first {
    use super::*;

    pub fn initialize_oracle(ctx: Context<InitializeOracle>) -> Result<()> {
        let oracle = &mut ctx.accounts.oracle;
        oracle.root = [0u8; 32];
        oracle.last_slot = 0;
        oracle.bump = ctx.bumps.oracle;
        msg!("Oracle root PDA initialized");
        Ok(())
    }

    pub fn update_oracle_root(ctx: Context<UpdateOracleRoot>, new_root: [u8; 32], slot: u64) -> Result<()> {
        let oracle = &mut ctx.accounts.oracle;
        oracle.root = new_root;
        oracle.last_slot = slot;
        msg!("Oracle root updated at slot {}", slot);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeOracle<'info> {
    #[account(init, payer = payer, space = 8 + 32 + 8 + 1, seeds = [b"oracle_root"], bump)]
    pub oracle: Account<'info, OracleRoot>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateOracleRoot<'info> {
    #[account(mut, seeds = [b"oracle_root"], bump = oracle.bump)]
    pub oracle: Account<'info, OracleRoot>,
    pub authority: Signer<'info>,
}

#[account]
pub struct OracleRoot {
    pub root: [u8; 32],
    pub last_slot: u64,
    pub bump: u8,
}