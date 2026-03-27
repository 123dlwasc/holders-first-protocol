const express = require("express");
const { exec } = require("child_process");
const app = express();

app.use(express.static("."));

app.get("/lookup", (req, res) => {
  const wallet = req.query.wallet || "DXU65912VjiPUhKR37TLiHCrbp4uNHVNNZiBdLv1uAx1";

  exec(`node lookup.js ${wallet}`, { encoding: "utf8" }, (error, stdout) => {
    if (error) return res.status(500).json({ error: "Lookup failed" });

    try {
      const data = JSON.parse(stdout);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to parse lookup output" });
    }
  });
});

app.listen(3000, () => {
  console.log("🚀 Live dashboard server running on http://localhost:3000/dashboard.html");
});