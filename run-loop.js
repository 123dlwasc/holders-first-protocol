const { execSync } = require("child_process");

console.log("=== Holders-First Production Loop v0.2 ===\n");

async function runCommand(cmd, name) {
  console.log(`→ ${name}...`);
  try {
    execSync(cmd, { stdio: "inherit", encoding: "utf8" });
    console.log(`✅ ${name} OK\n`);
    return true;
  } catch (err) {
    console.error(`❌ ${name} FAILED`);
    console.error(err.message || err);
    return false;
  }
}

async function cycle() {
  console.log(`\n=== Cycle started at ${new Date().toISOString()} ===`);

  const indexerOk = await runCommand(
    "node indexer.js DXU65912VjiPUhKR37TLiHCrbp4uNHVNNZiBdLv1uAx1",
    "Indexer"
  );

  if (!indexerOk) {
    console.log("Skipping oracle push due to indexer failure.");
    return;
  }

  await runCommand(
    "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com node update-oracle.js",
    "Oracle Push"
  );

  console.log(`🎉 Cycle completed at ${new Date().toISOString()}\n`);
}

async function main() {
  while (true) {
    await cycle();
    console.log("Waiting 5 minutes for next cycle...\n");
    await new Promise(r => setTimeout(r, 5 * 60 * 1000));
  }
}

main().catch(err => {
  console.error("Loop crashed:", err);
  process.exit(1);
});