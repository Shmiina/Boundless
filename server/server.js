// server/server.js
const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Path to db.json
const file = path.join(__dirname, 'db.json');

// Ensure db.json exists with at least empty object
if (!fs.existsSync(file)) {
  fs.writeFileSync(file, JSON.stringify({ pcs: {} }, null, 2));
}

// Setup lowdb adapter and instance
const adapter = new JSONFile(file);
const db = new Low(adapter);

// Initialize database with default PCs
async function initDb() {
  await db.read();
  db.data ||= { pcs: {
    PC1: { status: 'free', updatedBy: null, updatedAt: null },
    PC2: { status: 'free', updatedBy: null, updatedAt: null },
    PC3: { status: 'free', updatedBy: null, updatedAt: null }
  }};
  await db.write();
}

initDb().then(() => {
  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server });

  // Broadcast PC state to all WebSocket clients
  async function broadcastState() {
    await db.read();
    const payload = JSON.stringify({ type: "state", data: db.data.pcs });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    });
  }

  wss.on("connection", async ws => {
    await db.read();
    ws.send(JSON.stringify({ type: "state", data: db.data.pcs }));
    console.log("WS client connected");
  });

  // Endpoint to get current PCs
  app.get("/pcs", async (req, res) => {
    await db.read();
    res.json(db.data.pcs);
  });

  // Endpoint to update PC status
  app.post("/update", async (req, res) => {
    const { pc, status, updatedBy } = req.body;
    if (!pc || !status) return res.status(400).json({ error: "pc and status required" });

    await db.read();
    db.data.pcs[pc] ||= { status: 'free', updatedBy: null, updatedAt: null }; // create if missing

    db.data.pcs[pc] = {
      status,
      updatedBy: updatedBy || null,
      updatedAt: new Date().toISOString()
    };

    await db.write();
    await broadcastState();

    res.json({ ok: true });
  });

  // Serve frontend static files from root
  app.use('/', express.static(path.join(__dirname, '..')));

  const PORT = process.env.PORT || 8080;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
