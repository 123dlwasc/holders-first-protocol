// real-time-updater.js - Final Stable Hybrid Updater with Working Auto Merkle Push
const express = require("express");
const bodyParser = require("body-parser");
const Database = require("better-sqlite3");
const dotenv = require("dotenv");
const axios = require("axios");
const crypto = require("crypto");
const { MerkleTree } = require("merkletreejs");
const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");

dotenv.config();

const app = express();
const db = new Database("./db/hold_states.db");
const PORT = process.env.PORT || 3000;
const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
const WATCHED_WALLET = "6g32Xfhanv67Q2RY8MMtWYVTn1E3jrLyZewSxZSoFL5f";

app.use(bodyParser.json({ limit: "10mb" }));

const NOW = () => Math.floor(Date.now() / 1000);

function getDustThreshold(totalSupplyStr) {
  return (BigInt(totalSupplyStr) / 1_000_000n).toString();
}

function formatBalance(raw, decimals = 9) {
  return (Number(raw) / Math.pow(10, decimals)).toFixed(4);
}

function updateHoldState(wallet, mint, newRawBalanceStr, totalSupplyStr, decimals = 9) {
  const dustThreshold = BigInt(getDustThreshold(totalSupplyStr));
  const newBalance = BigInt(newRawBalanceStr);
  const uiBalance = formatBalance(newRawBalanceStr, decimals);

  const row = db.prepare(`
    SELECT current_balance, accrued_hold_seconds, last_buy_blocktime, last_updated_slot
    FROM hold_states 
    WHERE wallet_address = ? AND mint_address = ?
  `).get(wallet, mint) || {
    current_balance: "0",
    accrued_hold_seconds: 0,
    last_buy_blocktime: NOW(),
    last_updated_slot: NOW()
  };

  const oldBalance = BigInt(row.current_balance);
  let accrued = Number(row.accrued_hold_seconds);
  let lastBuy = row.last_buy_blocktime || NOW();
  const lastUpdated = Number(row.last_updated_slot || NOW());

  const wasHolding = oldBalance >= dustThreshold;
  const isHolding = newBalance >= dustThreshold;

  let logMessage = "";

  if (!wasHolding && isHolding) {
    lastBuy = NOW();
    logMessage = `[BUY] ${mint.slice(0,12)}... | Balance: ${uiBalance}`;
  } else if (wasHolding && !isHolding) {
    if (lastBuy) accrued += (NOW() - lastBuy);
    lastBuy = null;
    logMessage = `[SELL/DUST] ${mint.slice(0,12)}... | Balance: ${uiBalance}`;
  } else if (wasHolding && isHolding && newBalance < oldBalance) {
    if (lastBuy) accrued += (NOW() - lastBuy);
    lastBuy = NOW();
    logMessage = `[PARTIAL SELL] ${mint.slice(0,12)}... | Balance: ${uiBalance} (was ${formatBalance(oldBalance, decimals)})`;
  } else if (isHolding) {
    const elapsed = NOW() - lastUpdated;
    if (elapsed > 0) accrued += elapsed;
    if (elapsed > 300 || Math.abs(Number(newBalance) - Number(oldBalance)) > 500000) {
      logMessage = `[ACCRUE] ${mint.slice(0,12)}... | +${elapsed}s | Total: ${accrued}s | Balance: ${uiBalance}`;
    }
  }

  if (logMessage) {
    console.log(`[REAL-TIME] ${logMessage}`);
  }

  db.prepare(`
    INSERT OR REPLACE INTO hold_states
    (wallet_address, mint_address, current_balance, last_buy_blocktime,
     accrued_hold_seconds, last_updated_slot, mint_total_supply, dust_threshold)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    wallet, mint, newBalance.toString(), lastBuy,
    Math.floor(accrued), NOW(), totalSupplyStr, getDustThreshold(totalSupplyStr)
  );

  // Auto push Merkle root after meaningful changes
  if (logMessage) {
    setTimeout(pushMerkleRoot, 2000);
  }
}

async function pushMerkleRoot() {
  try {
    const rows = db.prepare("SELECT * FROM hold_states").all();
    if (rows.length === 0) return;

    const leaves = rows.map(row => {
      const lastBuy = row.last_buy_blocktime || 0;
      const accrued = row.accrued_hold_seconds || 0;
      const data = `${row.wallet_address}:${row.mint_address}:${row.current_balance}:${accrued}:${lastBuy}`;
      return crypto.createHash("sha256").update(Buffer.from(data)).digest();
    });

    const tree = new MerkleTree(leaves, (data) => crypto.createHash("sha256").update(data).digest());
    const root = tree.getRoot();

    // Use the same wallet loading logic as update-oracle.js
    const { Keypair } = require("@solana/web3.js");
    const fs = require("fs");
    const path = require("path");

    let wallet;
    const defaultPath = path.join(process.env.HOME || process.env.USERPROFILE, ".config/solana/id.json");

    if (process.env.ANCHOR_WALLET) {
      wallet = anchor.Wallet.local(process.env.ANCHOR_WALLET);
    } else if (fs.existsSync(defaultPath)) {
      const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(defaultPath, "utf-8")));
      const keypair = Keypair.fromSecretKey(secretKey);
      wallet = new anchor.Wallet(keypair);
    } else {
      console.warn(`[REAL-TIME] No wallet found for Merkle push. Set ANCHOR_WALLET or use default keypair.`);
      return;
    }

    const provider = new anchor.AnchorProvider(
      new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed"),
      wallet,
      { commitment: "confirmed" }
    );
    anchor.setProvider(provider);

    const program = anchor.workspace.HoldersFirst;
    const [oraclePda] = PublicKey.findProgramAddressSync([Buffer.from("oracle_root")], program.programId);

    const slot = await provider.connection.getSlot("confirmed");

    await program.methods
      .updateOracleRoot(root, new anchor.BN(slot))
      .accounts({
        oracle: oraclePda,
        authority: provider.wallet.publicKey,
      })
      .rpc({ commitment: "confirmed", skipPreflight: true });

    console.log(`[REAL-TIME] ✅ Auto-pushed Merkle root (${rows.length} records)`);
  } catch (err) {
    console.warn(`[REAL-TIME] Auto Merkle push failed: ${err.message}`);
  }
}

async function startPolling() {
  console.log(`[REAL-TIME] Polling started for wallet ${WATCHED_WALLET.slice(0,8)}...`);

  setInterval(async () => {
    try {
      const res = await axios.post(HELIUS_RPC, {
        jsonrpc: "2.0",
        id: "helius",
        method: "getTokenAccountsByOwner",
        params: [WATCHED_WALLET, { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" }, { encoding: "jsonParsed" }]
      });

      const accounts = res.data.result.value || [];

      for (const acc of accounts) {
        const info = acc.account.data.parsed.info;
        const mint = info.mint;
        const uiAmount = info.tokenAmount.uiAmount || 0;

        if (uiAmount <= 0) continue;

        const supplyData = await getTokenSupply(mint);
        const rawBalanceStr = Math.floor(uiAmount * Math.pow(10, supplyData.decimals)).toString();

        updateHoldState(WATCHED_WALLET, mint, rawBalanceStr, supplyData.amount, supplyData.decimals);
      }
    } catch (e) {
      console.warn(`[REAL-TIME] Polling error: ${e.message}`);
    }
  }, 8000);
}

async function getTokenSupply(mint) {
  try {
    const res = await axios.post(HELIUS_RPC, {
      jsonrpc: "2.0",
      id: "helius",
      method: "getTokenSupply",
      params: [mint]
    });
    return res.data.result.value;
  } catch (e) {
    return { amount: "0", decimals: 9 };
  }
}

app.post("/webhook", (req, res) => {
  console.log(`[REAL-TIME] Webhook ping at ${new Date().toISOString()}`);
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log(`[REAL-TIME] Hybrid updater running on port ${PORT}`);
  console.log(`[REAL-TIME] Webhook URL: https://immaturely-incorrect-toney.ngrok-free.dev/webhook`);
  startPolling();
});