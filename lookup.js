// lookup.js - Holders First: Quality Score lookup for a wallet
// Usage: node lookup.js <wallet_address>

const Database = require("better-sqlite3");
const axios = require("axios");

const db = new Database("./db/hold_states.db");

async function getTokenInfo(mint) {
  try {
    const res = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    const pair = res.data.pairs?.[0];
    if (!pair) {
      return { name: "—", ticker: "—", mcap: "—", mcapRaw: 0 };
    }

    const mcapRaw = pair.fdv || pair.marketCap || 0;
    let mcapStr = "—";
    if (mcapRaw > 1_000_000) mcapStr = `$${(mcapRaw / 1_000_000).toFixed(1)}M`;
    else if (mcapRaw > 1_000) mcapStr = `$${Math.floor(mcapRaw / 1_000)}k`;
    else if (mcapRaw > 0) mcapStr = `$${Math.floor(mcapRaw)}`;

    return {
      name: pair.baseToken?.name || "—",
      ticker: pair.baseToken?.symbol || "—",
      mcap: mcapStr,
      mcapRaw
    };
  } catch (e) {
    console.warn(`[LOOKUP] Failed to fetch DexScreener data for ${mint.slice(0,12)}...`);
    return { name: "—", ticker: "—", mcap: "—", mcapRaw: 0 };
  }
}

function calculateQualityScore(accruedHoldSeconds, mcapRaw, percentOfSupply) {
  const accruedDays = accruedHoldSeconds / 86400;

  // Time multiplier - gradual and dominant
  let timeMultiplier = 1.0;
  if (accruedDays >= 60) timeMultiplier = 4.0;
  else if (accruedDays >= 30) timeMultiplier = 3.0;
  else if (accruedDays >= 14) timeMultiplier = 2.5;
  else if (accruedDays >= 7) timeMultiplier = 2.0;
  else if (accruedDays >= 3) timeMultiplier = 1.5;

  // Strong supply percentage boost
  let supplyFactor = 1.0;
  if (percentOfSupply > 0.5) supplyFactor = 2.8;
  else if (percentOfSupply > 0.1) supplyFactor = 2.0;
  else if (percentOfSupply > 0.01) supplyFactor = 1.5;

  // Mild MCAP luxury bonus
  let mcapFactor = 1.0;
  if (mcapRaw > 10_000_000) mcapFactor = 1.45;
  else if (mcapRaw > 5_000_000) mcapFactor = 1.25;
  else if (mcapRaw > 2_000_000) mcapFactor = 1.1;

  let score = (accruedDays * 55 + 65) * timeMultiplier * supplyFactor * mcapFactor;

  // Hard global 8x cap
  return Math.floor(Math.min(score, 8 * (accruedDays * 12 + 100)));
}

async function lookupWallet(wallet) {
  const rows = db.prepare(`
    SELECT * FROM hold_states 
    WHERE wallet_address = ? 
    ORDER BY accrued_hold_seconds DESC
  `).all(wallet);

  if (rows.length === 0) {
    console.log(`[LOOKUP] No hold data found for wallet ${wallet}`);
    return;
  }

  let totalScore = 0;
  const tokens = [];

  for (const row of rows) {
    const info = await getTokenInfo(row.mint_address);

    const accruedHoldSeconds = Number(row.accrued_hold_seconds || 0);
    const accruedDays = accruedHoldSeconds / 86400;

    // Real % of supply
    const totalSupply = Number(row.mint_total_supply || 1);
    const percentOfSupply = totalSupply > 0 
      ? (Number(row.current_balance) / totalSupply) * 100 
      : 0;

    const qualityScorePerToken = calculateQualityScore(accruedHoldSeconds, info.mcapRaw, percentOfSupply);

    totalScore += qualityScorePerToken;

    // Current continuous hold days
    const currentHoldSeconds = row.last_buy_blocktime 
      ? Math.floor(Date.now() / 1000) - row.last_buy_blocktime 
      : 0;

    const timeMultiplier = accruedDays >= 60 ? 4.0 
      : accruedDays >= 30 ? 3.0 
      : accruedDays >= 14 ? 2.5 
      : accruedDays >= 7 ? 2.0 
      : accruedDays >= 3 ? 1.5 : 1.0;

    tokens.push({
      mint: row.mint_address,
      name: info.name,
      ticker: info.ticker,
      mcap: info.mcap,
      currentHoldDays: Number((currentHoldSeconds / 86400).toFixed(2)),
      accruedHoldDays: Number(accruedDays.toFixed(2)),
      currentBalance: Number(row.current_balance),
      multiplier: Number(timeMultiplier.toFixed(1)),
      contrib: parseFloat((qualityScorePerToken / totalScore * 100).toFixed(1))
    });
  }

  // Final wallet quality score: average per token + small multi-token bonus
  const finalQualityScore = Math.floor(totalScore / rows.length) + (rows.length * 8);

  console.log(JSON.stringify({
    wallet,
    qualityScore: finalQualityScore,
    tokenCount: rows.length,
    tokens
  }, null, 2));
}

const wallet = process.argv[2];
if (!wallet) {
  console.error("[LOOKUP] Usage: node lookup.js <wallet_address>");
  process.exit(1);
}

lookupWallet(wallet).catch(err => {
  console.error("[LOOKUP] Error:", err.message);
  process.exit(1);
});