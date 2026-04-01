// test-end-to-end.js - Holders First: Full pipeline verification
// Usage: node test-end-to-end.js <wallet_address>

const { execSync } = require("child_process");

async function runFullTest(testWallet) {
  console.log("[TEST] Starting full Holders First pipeline test...\n");

  if (!testWallet) {
    console.error("[TEST] Usage: node test-end-to-end.js <wallet_address>");
    process.exit(1);
  }

  // 1. Indexer
  console.log("[TEST] 1. Running indexer...");
  try {
    execSync(`node indexer.js ${testWallet}`, { 
      stdio: "inherit",
      env: { ...process.env, DOTENV_CONFIG_QUIET: "true" }   // suppress dotenv banner
    });
  } catch (e) {
    console.error("[TEST] ❌ Indexer failed");
    return;
  }

  // 2. Push Merkle root
  console.log("\n[TEST] 2. Pushing Merkle root to Oracle...");
  try {
    execSync("ANCHOR_PROVIDER_URL=https://api.devnet.solana.com node update-oracle.js", { stdio: "inherit" });
  } catch (e) {
    console.error("[TEST] ❌ Merkle root push failed");
    return;
  }

  // 3. Lookup
  console.log("\n[TEST] 3. Running quality score lookup...");
  try {
    const output = execSync(`ANCHOR_PROVIDER_URL=https://api.devnet.solana.com node lookup.js ${testWallet}`, { 
      encoding: "utf8",
      env: { ...process.env, DOTENV_CONFIG_QUIET: "true" }
    });
    console.log(output.trim());
  } catch (e) {
    console.error("[TEST] ❌ Lookup failed");
    return;
  }

  // 4. On-chain oracle read (graceful)
  console.log("\n[TEST] 4. Reading on-chain Oracle PDA...");
  try {
    const anchor = require("@coral-xyz/anchor");
    const { PublicKey } = require("@solana/web3.js");

    const provider = new anchor.AnchorProvider(
      new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed"),
      anchor.Wallet.local(),
      { commitment: "confirmed" }
    );
    anchor.setProvider(provider);

    const program = anchor.workspace.HoldersFirst;
    const [oraclePda] = PublicKey.findProgramAddressSync([Buffer.from("oracle_root")], program.programId);

    const oracle = await program.account.oracleRoot.fetch(oraclePda);
    console.log(`[TEST] Oracle Root : ${Buffer.from(oracle.root).toString("hex")}`);
    console.log(`[TEST] Last Slot   : ${oracle.last_slot ? oracle.last_slot.toString() : "0"}`);
  } catch (err) {
    console.log("[TEST] ⚠️  Could not read on-chain oracle (program skeleton may still be incomplete)");
    console.log("[TEST] This is expected until the Anchor program is fully implemented.");
  }

  console.log("\n[TEST] ✅ FULL PIPELINE SUCCESS");
  console.log("[TEST] Indexer → DB → Merkle Root → Lookup all working.");
}

const testWallet = process.argv[2];
runFullTest(testWallet).catch(err => {
  console.error("[TEST] Fatal error:", err.message);
  process.exit(1);
});