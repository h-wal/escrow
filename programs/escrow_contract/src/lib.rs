use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("bxZ8s8SSEi3qHiqWdQ1j5qTKEgwAy3gSoXf3TQDYSzB"); //decalring the contract's public key on chain.

#[program] // intitalizing the contract to make it excecutable
pub mod escrow_contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>, //this is the account which initialized the escrow
    #[account(mut)]
    pub initializer_deposit_token_account: Account<'info, TokenAccount>, //this is the account which holds the deposit token
    #[account(mut)]
    pub initializer_receive_token_account: Account<'info, TokenAccount>, //this is the account which will hold the receive token

    // PDA storing escrow state; allocated with enough space for discriminator + EscrowAccount
    #[account(
        init,
        payer = initializer,
        space = 8 + 32 + 32 + 32 + 8,
    )]
    pub initialize_escrow_struct_account: Account<'info, EscrowAccount>,

    pub deposit_mint: Account<'info, Mint>,
    ///CHECK: account
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = initializer,
        token::mint = deposit_mint,
        token::authority = vault_authority
    )]

    pub vault_token_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program : Program<'info , Token>,
    pub rent: Sysvar<'info , Rent>

}

#[account]
pub struct EscrowAccount {
    pub initializer: Pubkey, 
    pub initializer_deposit_token_account: Pubkey,
    pub initializer_receive_token_account: Pubkey,
    pub escrow_amount: u64,
    
}