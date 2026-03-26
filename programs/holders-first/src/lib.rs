use anchor_lang::prelude::*;

declare_id!("FZwjvmECrnwu1zdB675UXwsDs9CLm9oieckDBB9EULNR");

#[program]
pub mod holders_first {
    use super::*;

    pub fn initialize_quality_pda(ctx: Context<InitializeQualityPda>) -> Result<()> {
        let pda = &mut ctx.accounts.quality_pda;
        pda.owner = ctx.accounts.user.key();
        pda.score = 0;
        pda.bump = ctx.bumps.quality_pda;
        Ok(())
    }

    pub fn update_quality_score(ctx: Context<UpdateQualityScore>, new_score: u32, _merkle_proof: Vec<[u8; 32]>) -> Result<()> {
        let pda = &mut ctx.accounts.quality_pda;
        require!(new_score <= 100, ErrorCode::InvalidScore);
        
        // TODO: real Merkle verification will go here (using light-merkle or simple hash check)
        // For now, it is just a placeholder to demonstrate the flow.
        pda.score = new_score;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeQualityPda<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 4 + 1,
        seeds = [b"quality", user.key().as_ref()],
        bump
    )]
    pub quality_pda: Account<'info, QualityPda>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateQualityScore<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"quality", user.key().as_ref()],
        bump = quality_pda.bump
    )]
    pub quality_pda: Account<'info, QualityPda>,
}

#[account]
pub struct QualityPda {
    pub owner: Pubkey,
    pub score: u32,
    pub bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Score must be between 0 and 100")]
    InvalidScore,
}