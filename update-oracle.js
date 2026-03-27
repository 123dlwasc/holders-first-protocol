const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");
const Database = require("better-sqlite3");
const { MerkleTree } = require("merkletreejs");
const crypto = require("crypto");

const provider = new anchor.AnchorProvider(
  new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed"),
  anchor.Wallet.local(),
  { commitment: "confirmed" }
);
anchor.setProvider(provider);

const program = anchor.workspace.HoldersFirst;
const db = new Database("./db/hold_states.db");

function sha256(data) {
  return crypto.createHash("sha256").update(Buffer.from(data)).digest();
}

async function pushMerkleRoot() {
  console.log("\n=== Pushing Merkle Root to Oracle ===");

  const rows = db.prepare("SELECT * FROM hold_states").all();
  if (rows.length === 0) {
    console.log("No records in DB");
    return;
  }

  const leaves = rows.map(row => {
    const lastBuy = row.last_buy_blocktime || 0;
    const accrued = row.accrued_hold_seconds || 0;
    const data = `${row.wallet_address}:${row.mint_address}:${row.current_balance}:${accrued}:${lastBuy}`;
    return sha256(data);
  });

  const tree = new MerkleTree(leaves, sha256);
  const root = tree.getRoot();

  console.log(`Records: ${rows.length}`);
  console.log(`New Root : ${root.toString("hex")}`);

  const [oraclePda] = PublicKey.findProgramAddressSync([Buffer.from("oracle_root")], program.programId);

  try {
    const slot = await program.provider.connection.getSlot("confirmed");

    const tx = await program.methods
      .updateOracleRoot(root, new anchor.BN(slot))
      .accounts({
        oracle: oraclePda,
        authority: program.provider.wallet.publicKey,
      })
      .rpc({ commitment: "confirmed", skipPreflight: true });

    console.log("✅ Root successfully updated on-chain");
    console.log("Tx:", tx);
  } catch (err) {
    console.error("❌ Failed to update root:");
    console.error(err.message);
    if (err.logs) console.error("Logs:", err.logs);
  }
}

pushMerkleRoot().catch(console.error);