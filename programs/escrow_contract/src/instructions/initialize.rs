use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount},
};

use crate::state::EscrowState;

#[derive(Accounts)]
pub struct Initialize<'info> {
    //the owner of the source account and the inititailser of the escrow
    #[account(mut)]
    pub initializer: Signer<'info>,

    #[account(
        mint::token_program = token_program // check whether the owner of mint is the token program being passed
    )]
    pub mint_a: InterfaceAccount<'info, Mint>, //interface account to allow mints created using SPL-PROGRAM-22 or later

    #[account(
        mint::token_program = token_program
    )]
    pub mint_b: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint_a, // ensure that the mint of the account is the mint_a
        associated_token::authority = initializer, // ensure that the owner of the account has the authority and is the initializer
        associated_token::token_program = token_program // ensure that the ata is owned by token program
    )]
    pub initializer_ata_mint_a: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = initializer,
        seeds = [b"escrow", initializer.key().as_ref()],
        bump,
        space = 8 + EscrowState::INIT_SPACE
    )]
    pub escrow_account: Account<'info, EscrowState>,

    #[account(
        init,
        payer = initializer,
        associated_token::mint = mint_a,
        associated_token::authority = escrow_account,
        associated_token::token_program = token_program
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenAccount>, // here we are using Interface so that we can deserialize any acccount which implements the token account interface basically boht token program and token-22 porgram
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
