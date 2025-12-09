use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct EscrowState {
    pub initializer: Pubkey,
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub mint_a_being_offered: u64,
    pub mint_b_being_expected: u64,
    pub vault_authority_bump: u8,
    pub is_released: bool,
    pub is_funded: bool,
}
