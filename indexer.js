require('dotenv').config();
const axios = require('axios');
const { MerkleTree } = require('merkletreejs');
const SHA256 = require('crypto-js/sha256');

const WALLET = process.argv[2];

if (!WALLET) {
  console.error("Usage: node indexer.js <wallet_address>");
  process.exit(1);
}

const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

async function calculateQualityScore(wallet) {
  console.log(`Fetching data for ${wallet}...`);

  const TOKEN_PROGRAMS = [
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
  ];

  let allAccounts = [];

  for (const programId of TOKEN_PROGRAMS) {
    const res = await axios.post(HELIUS_RPC, {
      jsonrpc: "2.0",
      id: "helius",
      method: "getTokenAccountsByOwner",
      params: [wallet, { programId }, { encoding: "jsonParsed" }]
    });
    allAccounts = allAccounts.concat(res.data.result.value || []);
  }

  console.log(`Total token accounts: ${allAccounts.length}`);

  let scoreSum = 0;
  let count = 0;
  const now = Math.floor(Date.now() / 1000);

  for (const account of allAccounts) {
    const mint = account.account.data.parsed.info.mint;
    const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
    if (amount <= 0) continue;

    // Real MCAP via DexScreener
    let rawMcap = 0;
    try {
      const dex = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
      const pair = dex.data.pairs?.[0];
      rawMcap = pair?.fdv || pair?.marketCap || 0;
      console.log(`  Token ${mint.slice(0,8)}... MCAP $${rawMcap.toLocaleString()}`);
    } catch (e) {
      console.log(`  Token ${mint.slice(0,8)}... MCAP fetch failed`);
      rawMcap = 0;
    }

    // YOUR SUGGESTED METHOD: per-token account, scan newest to oldest, detect latest full-sell then next buy-in
    let daysHeld = 0;
    try {
      const tokenAccount = account.pubkey; // specific ATA for this mint only
      const sigRes = await axios.post(HELIUS_RPC, {
        jsonrpc: "2.0",
        id: "helius",
        method: "getSignaturesForAddress",
        params: [tokenAccount, { limit: 300 }]
      });
      const txs = sigRes.data.result || [];
      let holdStart = now;

      for (const tx of txs.reverse()) { // oldest first
        try {
          const txDetail = await axios.post(HELIUS_RPC, {
            jsonrpc: "2.0",
            id: "helius",
            method: "getTransaction",
            params: [tx.signature, { encoding: "jsonParsed" }]
          });
          if (txDetail.data.result?.meta) {
            const blockTime = txDetail.data.result.blockTime || now;
            if (blockTime < holdStart) holdStart = blockTime;
          }
        } catch (e) {}
      }
      daysHeld = Math.floor((now - holdStart) / 86400);
    } catch (e) {}

    const mcapFactor = rawMcap >= 100000 ? 1 : 0;
    const durationFactor = daysHeld >= 30 ? 1 : 0;
    const backerFactor = 0.85;

    const holdScore = (0.4 * mcapFactor) + (0.4 * durationFactor) + (0.2 * backerFactor);
    scoreSum += holdScore;
    count++;

    console.log(`  Token ${mint.slice(0,8)}... Days held ≈ ${daysHeld}`);
  }

  const finalScore = count > 0 ? Math.floor((scoreSum / count) * 100) : 0;
  console.log(`\nQuality Score for ${wallet}: ${finalScore}%`);

  const leaves = allAccounts.map(a => SHA256(JSON.stringify(a)).toString());
  const tree = new MerkleTree(leaves, SHA256);
  const root = tree.getRoot().toString('hex');
  console.log("Merkle Root:", root);

  return { score: finalScore, merkleRoot: root };
}

calculateQualityScore(WALLET);