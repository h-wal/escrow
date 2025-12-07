import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID, MINT_SIZE, createMint, createAccount, mintTo } from "@solana/spl-token";

import { EscrowContract } from "../target/types/escrow_contract";
import { expect } from "chai";

describe("test", () => {
  // Configure the client to use the local cluster.s
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();

  const program = anchor.workspace.escrow_contract as Program<EscrowContract>; // we are loding the smart contract from the workspace and type asserting it as a Program<EscrowContract> which comes from test/types

  let initializer: Keypair;

  let mintA: PublicKey;
  let initializerTokenA: PublicKey;
  let initializerTokenB: PublicKey;

  let escrowPda: PublicKey;
  let vaultAuthorityPda: PublicKey;
  let vaultBump: number;
  let vaultTokenAccount: PublicKey;

  it("Is initialized!", async () => {

    initializer = Keypair.generate();

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(initializer.publicKey, 2e9)
    );

    mintA = await createMint(
      provider.connection,
      initializer,
      initializer.publicKey,
      null, 
      9
    );

    initializerTokenA = await createAccount(
      provider.connection, initializer,
      mintA, initializer.publicKey
    );

    await mintTo(
      provider.connection,
      initializer,
      mintA,
      initializerTokenA,
      initializer.publicKey,
      1_000_000_000
    );

    initializerTokenB = await createAccount(
      provider.connection, initializer,
      mintA, 
      initializer.publicKey
    );

    [vaultAuthorityPda, vaultBump] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault-authority"),
        initializer.publicKey.toBuffer(),
      ],
      program.programId
    );

    vaultTokenAccount = await anchor.utils.token.associatedAddress({
      mint: mintA,
      owner: vaultAuthorityPda,
    })

    escrowPda = Keypair.generate().publicKey;

    const amount = new anchor.BN(500_000);

    const tx = await program.methods
      .initialize(amount)
      .accounts({
        initializer: initializer.publicKey,
        initializerDepositTokenAccount: initializerTokenA,
        initializerReceiveTokenAccount: initializerTokenB,
        escrowAccount: escrowPda,
        depositMint: mintA,
        vaultAuthorityPda,
        vaultTokenAccount,
        SystemProgram: SystemProgram.programId,
        TOKEN_PROGRAM_ID
      })
      .signers([initializer])
      .rpc();

      console.log("Initialize TX:", tx);
    
      const escrowAccount = await program.account.escrowAccount.fetch(escrowPda);
    // Add your test here.

      console.log("escrow-state: ", escrowAccount);

      expect(escrowAccount.initializer.toBase58()).be(initializer.publicKey.toBase58());
      expect(escrowAccount.escrowAmount.toString()).be(amount.toString());
      expect(escrowAccount.initializerDepositTokenAccount.toBase58()).be(initializerTokenA.toBase58());
      expect(escrowAccount.vaultAuthorityBump).be(vaultBump);

  });
});