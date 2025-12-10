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

    pub fn initialize(ctx: Context<Initialize>, amount: u64, expected_amount: u64) -> Result<()> {
        ctx.accounts
            .init_escrow(amount, expected_amount, &ctx.bumps)?;
        ctx.accounts.fund_escrow(amount)
    }
}

