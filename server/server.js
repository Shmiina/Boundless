// server/server.js
const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Database setup with default data for lowdb v6+
const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

async function initDb() {
  await db.read();
  db.data ||= { pcs: {
    PC1: { status: 'free', updatedBy: null, updatedAt: null },
    PC2: { status: 'free', updatedBy: null, updatedAt: null },
    PC3: { status: 'free', updatedBy: null, updatedAt: null }
  }};
  await db.write();
}
initDb();

// HTTP server + WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Broadcast PC state to all WS clients
function broadcastState() {
  const payload = JSON.stringify({ type: "state", data: db.data.pcs });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}

wss.on("connection", ws => {
  console.log("WS client connected");
  ws.send(JSON.stringify({ type: "state", data: db.data.pcs }));
});

// Endpoint: get current PCs
app.get("/pcs", async (req, res) => {
  await db.read();
  res.json(db.data.pcs);
});

// Endpoint: update PC status
app.post("/update", async (req, res) => {
  const { pc, status, updatedBy } = req.body;
  if (!pc || !status) return res.status(400).json({ error: "pc and status required" });

  await db.read();
  if (!db.data.pcs[pc]) return res.status(400).json({ error: "pc not found" });

  db.data.pcs[pc] = {
    status,
    updatedBy: updatedBy || null,
    updatedAt: new Date().toISOString()
  };

  await db.write();
  broadcastState();

  res.json({ ok: true });
});

// Serve frontend static files from repo root
app.use('/', express.static(path.join(__dirname, '..')));

// Use Render's PORT environment variable
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
