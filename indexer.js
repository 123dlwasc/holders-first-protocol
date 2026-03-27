// indexer.js - Final robust version (wall-clock accrual + clean schema)
const dotenv = require("dotenv");
dotenv.config();

const Database = require("better-sqlite3");
const axios = require("axios");

const db = new Database("./db/hold_states.db");
const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY || "YOUR_HELIUS_KEY_HERE"}`;

const NOW = Math.floor(Date.now() / 1000);

function calculateTimeMultiplier(accruedSeconds, currentHoldSeconds) {
  const effectiveDays = (currentHoldSeconds + 0.3 * accruedSeconds) / 86400;
  return 1.0 + Math.min(2.0, Math.max(0.0, (effectiveDays - 7) / 23 * 2.0));
}

function updateHoldState(wallet, mint, newBalanceStr, totalSupplyStr) {
  const dustThreshold = BigInt(totalSupplyStr) * 10000n / 100000000n;

  const row = db.prepare(`
    SELECT current_balance, accrued_hold_seconds, last_indexer_run 
    FROM hold_states WHERE wallet_address = ? AND mint_address = ?
  `).get(wallet, mint) || { current_balance: "0", accrued_hold_seconds: 0, last_indexer_run: NOW };

  const oldBal = BigInt(row.current_balance);
  const newBal = BigInt(newBalanceStr);

  let accrued = Number(row.accrued_hold_seconds);
  const timeSinceLastRun = NOW - (row.last_indexer_run || NOW);

  if (newBal > dustThreshold) {
    accrued += timeSinceLastRun;
  }

  db.prepare(`
    INSERT OR REPLACE INTO hold_states 
    (wallet_address, mint_address, current_balance, accrued_hold_seconds, last_indexer_run, mint_total_supply, dust_threshold, mcap)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).run(wallet, mint, newBal.toString(), accrued, NOW, totalSupplyStr, dustThreshold.toString());

  const currentHoldSeconds = newBal > dustThreshold ? timeSinceLastRun : 0;
  return calculateTimeMultiplier(accrued, currentHoldSeconds);
}

async function processWallet(wallet) {
  console.log(`\nProcessing wallet: ${wallet}`);

  const TOKEN_PROGRAMS = [
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
  ];

  let allAccounts = [];

  for (const programId of TOKEN_PROGRAMS) {
    const accountsRes = await axios.post(HELIUS_RPC, {
      jsonrpc: "2.0", id: "helius",
      method: "getTokenAccountsByOwner",
      params: [wallet, { programId }, { encoding: "jsonParsed" }]
    });
    allAccounts = allAccounts.concat(accountsRes.data.result.value || []);
  }

  console.log(`Found ${allAccounts.length} token accounts (both programs)`);

  for (const acc of allAccounts) {
    const info = acc.account.data.parsed.info;
    const mint = info.mint;
    const uiAmount = info.tokenAmount.uiAmount || 0;
    if (uiAmount <= 0) continue;

    const supplyRes = await axios.post(HELIUS_RPC, {
      jsonrpc: "2.0", id: "helius",
      method: "getTokenSupply",
      params: [mint]
    });
    const totalSupplyStr = supplyRes.data.result.value.amount;

    const timeMultiplier = updateHoldState(wallet, mint, (uiAmount * 1e9).toString(), totalSupplyStr);

    let mcap = 0;
    try {
      const dexRes = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
      const pair = dexRes.data.pairs?.[0];
      mcap = pair?.fdv || pair?.marketCap || 0;
    } catch (e) {}

    db.prepare(`
      UPDATE hold_states SET mcap = ? WHERE wallet_address = ? AND mint_address = ?
    `).run(mcap, wallet, mint);

    console.log(`  ${mint.slice(0,12)}... MCAP $${Math.floor(mcap).toLocaleString()} | Multiplier ${timeMultiplier.toFixed(2)}x`);
  }
}

const wallets = process.argv.slice(2);
if (wallets.length === 0) {
  console.error("Error: No wallet provided. Usage: node indexer.js <wallet>");
  process.exit(1);
}

console.log(`Starting batch processing for ${wallets.length} wallet(s)...\n`);

(async () => {
  for (const wallet of wallets) {
    await processWallet(wallet);
  }
  console.log("\nBatch processing finished.");
  console.log("Run: ANCHOR_PROVIDER_URL=https://api.devnet.solana.com node update-oracle.js");
})().catch(console.error);