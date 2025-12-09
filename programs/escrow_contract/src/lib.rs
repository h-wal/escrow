use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer},
};

pub mod instructions;
pub mod state;

pub use instructions::*;
pub use state::*;

declare_id!("bxZ8s8SSEi3qHiqWdQ1j5qTKEgwAy3gSoXf3TQDYSzB"); //decalring the contract's public key on chain.

#[program] // intitalizing the contract to make it excecutable
pub mod escrow_contract {

    use super::*;

    pub fn initialize(ctx: Context<Initialize>, amount: u64) -> Result<()> {
        let bump = ctx.bumps.vault_authority;
        let escrow = &mut ctx.accounts.escrow_account;

        escrow.initializer = ctx.accounts.initializer.key();
        escrow.initializer_deposit_token_account =
            ctx.accounts.initializer_deposit_token_account.key();
        escrow.initializer_receive_token_account =
            ctx.accounts.initializer_receive_token_account.key();
        escrow.vault_authority_bump = bump;
        escrow.escrow_amount = amount;

        let transfer_instruction = Transfer {
            from: ctx
                .accounts
                .initializer_deposit_token_account
                .to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.initializer.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        );

        transfer(cpi_ctx, amount)?;
        msg!(
            "Escrow account created for user : {:?}",
            ctx.accounts.initializer.key()
        );
        Ok(())
    }
}
