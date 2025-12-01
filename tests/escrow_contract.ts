import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { EscrowContract } from "../target/types/escrow_contract";

describe("escrow_contract", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.escrowContract as Program<EscrowContract>;
  const wallet = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  it("initializes and completes an escrow", async () => {
    const escrowAmount = 1_000;

    // Create two mints: one for initializer deposit, one for taker deposit.
    const depositMint = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      0
    );
    const takerMint = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      0
    );

    const initializerDepositTokenAccount =
      await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        depositMint,
        wallet.publicKey
      );
    const initializerReceiveTokenAccount =
      await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        takerMint,
        wallet.publicKey
      );

    await mintTo(
      connection,
      wallet.payer,
      depositMint,
      initializerDepositTokenAccount.address,
      wallet.publicKey,
      escrowAmount
    );

    const taker = anchor.web3.Keypair.generate();
    await connection.confirmTransaction(
      await connection.requestAirdrop(
        taker.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      )
    );

    const takerDepositTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      takerMint,
      taker.publicKey
    );
    const takerReceiveTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      depositMint,
      taker.publicKey
    );

    await mintTo(
      connection,
      wallet.payer,
      takerMint,
      takerDepositTokenAccount.address,
      wallet.publicKey,
      escrowAmount
    );

    const escrowAccount = anchor.web3.Keypair.generate();
    const vaultTokenAccount = anchor.web3.Keypair.generate();
    const [vaultAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrowAccount.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initialize(new anchor.BN(escrowAmount))
      .accounts({
        initializer: wallet.publicKey,
        depositMint,
        initializerDepositTokenAccount: initializerDepositTokenAccount.address,
        initializerReceiveTokenAccount:
          initializerReceiveTokenAccount.address,
        escrowAccount: escrowAccount.publicKey,
        vaultAuthority,
        vaultTokenAccount: vaultTokenAccount.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([escrowAccount, vaultTokenAccount])
      .rpc();

    const vaultInfo = await getAccount(
      connection,
      vaultTokenAccount.publicKey
    );
    assert.equal(Number(vaultInfo.amount), escrowAmount);

    await program.methods
      .exchange()
      .accounts({
        taker: taker.publicKey,
        initializer: wallet.publicKey,
        takerDepositTokenAccount: takerDepositTokenAccount.address,
        takerReceiveTokenAccount: takerReceiveTokenAccount.address,
        initializerReceiveTokenAccount:
          initializerReceiveTokenAccount.address,
        vaultTokenAccount: vaultTokenAccount.publicKey,
        vaultAuthority,
        escrowAccount: escrowAccount.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([taker])
      .rpc();

    const takerReceiveInfo = await getAccount(
      connection,
      takerReceiveTokenAccount.address
    );
    const initializerReceiveInfo = await getAccount(
      connection,
      initializerReceiveTokenAccount.address
    );

    assert.equal(Number(takerReceiveInfo.amount), escrowAmount);
    assert.equal(Number(initializerReceiveInfo.amount), escrowAmount);

    const escrowState = await program.account.escrowAccount.fetch(
      escrowAccount.publicKey
    );
    assert.equal(escrowState.status, 1); // Completed
  }).timeout(120_000);
});
