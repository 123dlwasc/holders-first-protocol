import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { HoldersFirst } from "../target/types/holders_first";

describe("update-quality-score", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.HoldersFirst as Program<HoldersFirst>;

  it("Updates Quality PDA from indexer score", async () => {
    const user = provider.wallet.publicKey;

    const [qualityPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("quality"), user.toBuffer()],
      program.programId
    );

    const score = 42; // change this number to whatever the indexer outputs

    await program.methods
      .updateQualityScore(score, [])
      .accounts({
        user: user,
        qualityPda: qualityPda,
      })
      .rpc();

    const pdaAccount = await program.account.qualityPda.fetch(qualityPda);
    console.log("✅ PDA updated successfully");
    console.log("Final score on-chain:", pdaAccount.score);
    console.log("PDA address:", qualityPda.toBase58());
  });
});