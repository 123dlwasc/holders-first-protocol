// indexer.js - Holders First: Polling-based hold state indexer
// Usage: node indexer.js <wallet1> [wallet2 ...] [--verbose]

const dotenv = require("dotenv");
dotenv.config();

const Database = require("better-sqlite3");
const axios = require("axios");

const db = new Database("./db/hold_states.db");
const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

const isVerbose = process.argv.includes("--verbose");

function getDustThreshold(totalSupplyStr) {
  return (BigInt(totalSupplyStr) / 1_000_000n).toString();
}

async function getTokenSupply(mint) {
  try {
    const res = await axios.post(HELIUS_RPC, {
      jsonrpc: "2.0",
      id: "helius",
      method: "getTokenSupply",
      params: [mint]
    });
    return {
      amount: res.data.result.value.amount,
      decimals: res.data.result.value.decimals
    };
  } catch (e) {
    console.warn(`[INDEXER] Failed to get supply for ${mint.slice(0,12)}...`);
    return { amount: "0", decimals: 9 };
  }
}

function updateHoldState(wallet, mint, newRawBalanceStr, totalSupplyStr) {
  const NOW = Math.floor(Date.now() / 1000);
  const dustThreshold = BigInt(getDustThreshold(totalSupplyStr));
  const newBalance = BigInt(newRawBalanceStr);

  const row = db.prepare(`
    SELECT current_balance, accrued_hold_seconds, last_buy_blocktime, last_updated_slot
    FROM hold_states 
    WHERE wallet_address = ? AND mint_address = ?
  `).get(wallet, mint) || {
    current_balance: "0",
    accrued_hold_seconds: 0,
    last_buy_blocktime: NOW,
    last_updated_slot: NOW
  };

  const oldBalance = BigInt(row.current_balance);
  let accrued = Number(row.accrued_hold_seconds);
  let lastBuy = row.last_buy_blocktime || NOW;
  const lastUpdated = Number(row.last_updated_slot || NOW);

  const wasHolding = oldBalance >= dustThreshold;
  const isHolding = newBalance >= dustThreshold;

  if (!wasHolding && isHolding) {
    lastBuy = NOW;
    if (isVerbose) console.log(`[INDEXER] [BUY EVENT] ${mint.slice(0,12)}...`);
  } else if (wasHolding && !isHolding) {
    if (lastBuy) accrued += (NOW - lastBuy);
    lastBuy = null;
    if (isVerbose) console.log(`[INDEXER] [SELL BELOW DUST] ${mint.slice(0,12)}...`);
  } else if (isHolding) {
    const elapsed = NOW - lastUpdated;
    if (elapsed > 0) {
      accrued += elapsed;
    }
  }

  db.prepare(`
    INSERT OR REPLACE INTO hold_states
    (wallet_address, mint_address, current_balance, last_buy_blocktime,
     accrued_hold_seconds, last_updated_slot, mint_total_supply, dust_threshold)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    wallet, mint, newBalance.toString(), lastBuy,
    Math.floor(accrued), NOW, totalSupplyStr, getDustThreshold(totalSupplyStr)
  );

  const currentHoldSeconds = lastBuy ? NOW - lastBuy : 0;

  return {
    isHolding,
    currentHoldSeconds,
    accruedHoldSeconds: accrued
  };
}

async function processWallet(wallet) {
  if (isVerbose) console.log(`\n[INDEXER] Processing wallet: ${wallet}`);

  const TOKEN_PROGRAMS = [
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
  ];

  let allAccounts = [];
  for (const programId of TOKEN_PROGRAMS) {
    try {
      const res = await axios.post(HELIUS_RPC, {
        jsonrpc: "2.0",
        id: "helius",
        method: "getTokenAccountsByOwner",
        params: [wallet, { programId }, { encoding: "jsonParsed" }]
      });
      if (res.data.result?.value) allAccounts = allAccounts.concat(res.data.result.value);
    } catch (e) {
      console.error(`[INDEXER] Failed to fetch token accounts for program ${programId.slice(0,8)}...`);
    }
  }

  if (isVerbose) console.log(`[INDEXER] Found ${allAccounts.length} token accounts from Helius`);

  let processed = 0;
  let skippedZero = 0;

  for (const acc of allAccounts) {
    const info = acc.account.data.parsed.info;
    const mint = info.mint;
    const uiAmount = info.tokenAmount.uiAmount ?? 0;

    if (uiAmount <= 0) {
      if (isVerbose) console.log(`[INDEXER] [SKIPPED] ${mint.slice(0,12)}... | Balance: 0`);
      skippedZero++;
      continue;
    }

    processed++;

    const supplyData = await getTokenSupply(mint);
    const totalSupplyStr = supplyData.amount;
    const decimals = supplyData.decimals;

    const rawBalanceStr = Math.floor(uiAmount * Math.pow(10, decimals)).toString();

    const state = updateHoldState(wallet, mint, rawBalanceStr, totalSupplyStr);

    console.log(`[INDEXER] ${mint.slice(0,12)}... | Balance: ${uiAmount.toFixed(4)} | Holding: ${state.isHolding} | Current: ${Math.floor(state.currentHoldSeconds/86400)}d | Accrued: ${state.accruedHoldSeconds}s`);
  }

  if (isVerbose || processed > 0) {
    console.log(`[INDEXER] Summary: Processed ${processed} holding tokens | Skipped ${skippedZero} zero-balance accounts`);
  }
}

const wallets = process.argv.filter(arg => !arg.startsWith("--"));
wallets.shift(); // remove 'node' and script name

if (wallets.length === 0) {
  console.error("[INDEXER] Usage: node indexer.js <wallet1> [wallet2 ...] [--verbose]");
  process.exit(1);
}

(async () => {
  try {
    for (const wallet of wallets) {
      await processWallet(wallet);
    }
    console.log("[INDEXER] Run completed successfully.");
  } catch (err) {
    console.error("[INDEXER] Fatal error:", err.message);
    process.exit(1);
  }
})();