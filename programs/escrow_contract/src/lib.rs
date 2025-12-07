use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer, transfer};


declare_id!("bxZ8s8SSEi3qHiqWdQ1j5qTKEgwAy3gSoXf3TQDYSzB"); //decalring the contract's public key on chain.

#[program] // intitalizing the contract to make it excecutable
pub mod escrow_contract {

    use super::*;

    pub fn initialize(ctx: Context<Initialize>, amount: u64) -> Result<()> {
        
        let bump = ctx.bumps.vault_authority;
        let escrow = &mut ctx.accounts.escrow_account;

        escrow.initializer = ctx.accounts.initializer.key();
        escrow.initializer_deposit_token_account = ctx.accounts.initializer_deposit_token_account.key();
        escrow.initializer_receive_token_account = ctx.accounts.initializer_receive_token_account.key();
        escrow.vault_authority_bump = bump;
        escrow.escrow_amount = amount;

        let transfer_instruction = Transfer {
            from: ctx.accounts.initializer_deposit_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.initializer.to_account_info()
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        );

        transfer(cpi_ctx, amount)?;
        msg!("Escrow account created for user : {:?}", ctx.accounts.initializer.key());
        Ok(())

    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>, //this is the account which initialized the escrow
    #[account(
        mut,
        constraint = initializer_deposit_token_account.owner == initializer.key(),
        constraint = initializer_deposit_token_account.mint == deposit_mint.key()
    )]
    pub initializer_deposit_token_account: Account<'info, TokenAccount>, //this is the account which holds the deposit token
    #[account(
        mut,
        constraint = initializer_receive_token_account.owner == initializer.key() //onwer of this account must be the initializer
    )]
    pub initializer_receive_token_account: Account<'info, TokenAccount>, //this is the account which will hold the receive token

    // PDA storing escrow state; allocated with enough space for discriminator + EscrowAccount
    #[account(
        init,
        payer = initializer,
        space = 8 + 32 + 32 + 32 + 8 + 1,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    pub deposit_mint: Account<'info, Mint>,

    /// CHECK:
    #[account(
        seeds = [b"vault-authority" , initializer.key().as_ref()],
        bump
    )]
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
}

#[account]
pub struct EscrowAccount {
    pub initializer: Pubkey,  //32
    pub initializer_deposit_token_account: Pubkey, //32
    pub initializer_receive_token_account: Pubkey, //32
    pub escrow_amount: u64, //8
    pub vault_authority_bump: u8 //1
}