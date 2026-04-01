// update-oracle.js - Holders First: Push Merkle root of hold states to on-chain Oracle
// Usage: ANCHOR_PROVIDER_URL=https://api.devnet.solana.com node update-oracle.js

const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");
const { Keypair } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { MerkleTree } = require("merkletreejs");
const crypto = require("crypto");

const db = new Database("./db/hold_states.db");

function getWallet() {
  const defaultPath = path.join(process.env.HOME || process.env.USERPROFILE, ".config/solana/id.json");

  if (process.env.ANCHOR_WALLET) {
    return anchor.Wallet.local(process.env.ANCHOR_WALLET);
  }

  if (fs.existsSync(defaultPath)) {
    const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(defaultPath, "utf-8")));
    const keypair = Keypair.fromSecretKey(secretKey);
    return new anchor.Wallet(keypair);
  }

  throw new Error(`ANCHOR_WALLET not set and default keypair not found at ${defaultPath}.\nRun: solana-keygen new or set ANCHOR_WALLET env variable.`);
}

const wallet = getWallet();

const provider = new anchor.AnchorProvider(
  new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed"),
  wallet,
  { commitment: "confirmed" }
);

anchor.setProvider(provider);

const program = anchor.workspace.HoldersFirst;

function sha256(data) {
  return crypto.createHash("sha256").update(Buffer.from(data)).digest();
}

async function pushMerkleRoot() {
  console.log("[ORACLE] Pushing Merkle root to on-chain Oracle...");

  const rows = db.prepare("SELECT * FROM hold_states").all();

  if (rows.length === 0) {
    console.log("[ORACLE] No records in DB - nothing to push");
    return;
  }

  const leaves = rows.map(row => {
    const lastBuy = row.last_buy_blocktime || 0;
    const accrued = row.accrued_hold_seconds || 0;
    const data = `${row.wallet_address}:${row.mint_address}:${row.current_balance}:${accrued}:${lastBuy}`;
    return sha256(data);
  });

  const tree = new MerkleTree(leaves, sha256);
  const root = tree.getRoot().toString("hex");

  console.log(`[ORACLE] Records: ${rows.length} | Root: ${root}`);

  const [oraclePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("oracle_root")], 
    program.programId
  );

  try {
    const slot = await program.provider.connection.getSlot("confirmed");

    const tx = await program.methods
      .updateOracleRoot(Buffer.from(root, "hex"), new anchor.BN(slot))
      .accounts({
        oracle: oraclePda,
        authority: program.provider.wallet.publicKey,
      })
      .rpc({ commitment: "confirmed", skipPreflight: true });

    console.log(`[ORACLE] ✅ Root successfully updated on-chain`);
    console.log(`[ORACLE] Tx: ${tx}`);
  } catch (err) {
    console.error(`[ORACLE] ❌ Failed to update root:`);
    console.error(`[ORACLE] ${err.message}`);
    if (err.logs) console.error(`[ORACLE] Logs:`, err.logs);
    process.exit(1);
  }
}

pushMerkleRoot().catch(err => {
  console.error("[ORACLE] Fatal error:", err.message);
  process.exit(1);
});