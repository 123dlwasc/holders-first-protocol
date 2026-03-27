const Database = require("better-sqlite3");
const axios = require("axios");
const db = new Database("./db/hold_states.db");

const WALLET = process.argv[2] || "DXU65912VjiPUhKR37TLiHCrbp4uNHVNNZiBdLv1uAx1";

async function getTokenMetadata(mint) {
  try {
    const res = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    const pair = res.data.pairs?.[0];
    if (pair && pair.baseToken) {
      return {
        name: pair.baseToken.name || "Unknown Token",
        ticker: pair.baseToken.symbol || mint.slice(0, 8) + "..."
      };
    }
  } catch (e) {}
  return { name: "Unknown Token", ticker: mint.slice(0, 8) + "..." };
}

function formatMCAP(mcap) {
  if (!mcap || mcap === 0) return "—";
  if (mcap >= 1000000000) return `$${(mcap / 1000000000).toFixed(1)}B`;
  if (mcap >= 1000000) return `$${(mcap / 1000000).toFixed(1)}M`;
  if (mcap >= 1000) return `$${(mcap / 1000).toFixed(0)}k`;
  return `$${mcap}`;
}

async function lookupWallet() {
  const rows = db.prepare(`
    SELECT * FROM hold_states 
    WHERE wallet_address = ?
    ORDER BY mcap DESC
  `).all(WALLET);

  if (rows.length === 0) {
    console.log(JSON.stringify({ error: "No records" }));
    return;
  }

  let totalScore = 0;
  const tokens = [];

  for (const row of rows) {
    const currentHoldSec = row.last_buy_blocktime 
      ? Math.floor(Date.now() / 1000) - row.last_buy_blocktime 
      : 0;

    const effectiveDays = (currentHoldSec + 0.3 * (row.accrued_hold_seconds || 0)) / 86400;
    const timeMultiplier = 1.0 + Math.min(2.0, Math.max(0.0, (effectiveDays - 7) / 23 * 2.0));

    const mcapFactor = (row.mcap || 0) >= 100000 ? 1 : 0;
    const backerFactor = 0.85;

    const rawScore = 0.4 * mcapFactor + 0.4 * timeMultiplier + 0.2 * backerFactor;
    totalScore += rawScore;

    const meta = await getTokenMetadata(row.mint_address);

    tokens.push({
      mint: row.mint_address,
      name: meta.name,
      ticker: meta.ticker,
      mcap: formatMCAP(row.mcap),
      currentHoldDays: Math.floor(currentHoldSec / 86400),
      accruedHoldDays: Math.floor((row.accrued_hold_seconds || 0) / 86400),
      currentBalance: parseFloat(row.current_balance || 0),
      multiplier: parseFloat(timeMultiplier.toFixed(2)),
      contrib: parseFloat(rawScore.toFixed(3))
    });
  }

  const avgRaw = totalScore / rows.length;
  const normalizedScore = Math.min(100, Math.max(0, Math.round(avgRaw * 75)));

  console.log(JSON.stringify({
    wallet: WALLET,
    qualityScore: normalizedScore,
    tokenCount: rows.length,
    tokens: tokens
  }, null, 2));
}

lookupWallet().catch(err => {
  console.log(JSON.stringify({ error: err.message }));
});