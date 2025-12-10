use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct EscrowState { // this is the struct which will be saved on chain
    pub initializer: Pubkey,
    pub mint_a: Pubkey, //mint being offered by the initialzier
    pub mint_b: Pubkey, //mint being expected by the initialzer
    pub mint_a_being_offered: u64, //amount of mint a being offered by the initializer
    pub mint_b_being_expected: u64, //amount of mint b being expected by the initializer
    pub vault_authority_bump: u8, //the bump of the vault pda which was created by the contract
    pub is_released: bool, //whether the funds have been already released
    pub is_funded: bool, // whether the escrow vault has been funded
}
