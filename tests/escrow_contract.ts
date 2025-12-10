import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID, MINT_SIZE, createMint, createAccount, mintTo, getAssociatedTokenAddressSync } from "@solana/spl-token";
import * as spl from "@solana/spl-token"

import { EscrowContract } from "../target/types/escrow_contract";
import { expect } from "chai";
import { token } from "@coral-xyz/anchor/dist/cjs/utils";

describe("exchange_escrow", () => {
  // Configure the client to use the local cluster.s
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();

  const program = anchor.workspace.escrow_contract as Program<EscrowContract>; // we are loding the smart contract from the workspace and type asserting it as a Program<EscrowContract> which comes from test/types
  const programId = program.programId;
  const connection = provider.connection;
  const tokenProgram = spl.TOKEN_PROGRAM_ID;

  const confirm = async (signature: string): Promise<string> => {
    const block = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...block
    });
    return signature
  }

  const [initializer, receiver, mintA, mintB] = Array.from(
    {length: 4},
    () => Keypair.generate()
  ); // array.from({lenght: X}, () => {}) builds an array of lenght x and runs the function given as the second argument for each and every elemenet and then we are desturcturing the array formed into the desired array. 

  const [initializeAtaA, initializeAtaB, receiverAtaA, receiverAtaB] = [initializer, receiver]
    .map((a) =>
      [mintA, mintB].map((m) =>
        getAssociatedTokenAddressSync(
          m.publicKey,
          a.publicKey,
          false,
        )
      )
    )
    .flat();

  const escrow = PublicKey.findProgramAddressSync(
    [
      Buffer.from("escrow"),
      initializer.publicKey.toBuffer(),
    ],
    programId
  )[0];

  const vault = getAssociatedTokenAddressSync(
    mintA.publicKey,
    escrow,
    true,
  )

  const accounts = {
    initializer: initializer.publicKey,
    receiver: receiver.publicKey,
    mintA: mintA.publicKey,
    mintB: mintB.publicKey,
    initializeAtaA,
    initializeAtaB,
    receiverAtaA,
    receiverAtaB,
    escrow,
    vault,
    tokenProgram
  }
  
  console.log(program.idl);

  it("airdrops and creates mint", async () => {
    // calculating the min bal requried for rent exempt for a mint (we are passing connection as an arg because it depends on the connection and can vary from time to time)
    let lamportsForRentExemption = await spl.getMinimumBalanceForRentExemptMint(connection as any); //check and remove as any
    let tx = new anchor.web3.Transaction();

    tx.feePayer = provider.publicKey;

    tx.instructions = [

      ...[initializer, receiver].map((account) => 
        SystemProgram.transfer({
          fromPubkey: provider.publicKey,
          toPubkey: account.publicKey,
          lamports: 100 * LAMPORTS_PER_SOL

        })
      ),

      ...[mintA, mintB].map((mint) => 
        SystemProgram.createAccount({
          fromPubkey: provider.publicKey,
          newAccountPubkey: mint.publicKey,
          lamports: lamportsForRentExemption,
          space: spl.MINT_SIZE,
          programId: tokenProgram
        })
      ),

      ...[{
        mint: mintA.publicKey ,
        authority: initializer.publicKey,
        ata: initializeAtaA
      },
      {
        mint: mintB.publicKey,
        authority: receiver.publicKey,
        ata: receiverAtaB
      }].flatMap((x) => [
        spl.createInitializeMint2Instruction(
          x.mint,
          6,
          x.authority,
          null,
        ),

        spl.createAssociatedTokenAccountIdempotentInstruction(
          provider.publicKey,
          x.ata,
          x.authority,
          x.mint,
        ),

        spl.createMintToInstruction(
          x.mint,
          x.ata,
          x.authority,
          100*LAMPORTS_PER_SOL,
          undefined,
        ),
      ]),
    ];

    await provider.sendAndConfirm(tx, [initializer, receiver, mintA, mintB]);
    
  });
 
  it("initializes", async () => {
  await program.methods
    .initialize(new anchor.BN(1e6), new anchor.BN(1e6))
    .accounts({ ...accounts })
    .signers([initializer]) // signer is req here because maker is supposed to sign this tx else the provider wallet will sign the tx
    .rpc()
    .then(confirm)
  })

});
 