// server.js (Node.js WebSocket server for synchronized countdown timer)
const WebSocket = require("ws");
const express = require("express");
const path = require("path");
const http = require("http");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const sessions = {}; // { code: { clients: [], duration, endTime } }

function broadcast(sessionCode, data) {
  const session = sessions[sessionCode];
  if (!session) return;
  session.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on("connection", ws => {
  let joinedSession = null;

  ws.on("message", message => {
    const msg = JSON.parse(message);

    if (msg.type === "join") {
      const code = msg.code.toUpperCase();
      joinedSession = code;
      if (!sessions[code]) sessions[code] = { clients: [], duration: 0, endTime: null };
      sessions[code].clients.push(ws);
      ws.send(JSON.stringify({ type: "joined", code }));
    }

    if (msg.type === "start" && joinedSession) {
      const session = sessions[joinedSession];
      const now = Date.now();
      session.duration = msg.duration;
      session.endTime = now + msg.duration;
      broadcast(joinedSession, {
        type: "start",
        startTime: now,
        duration: msg.duration
      });
    }

    if (msg.type === "reset" && joinedSession) {
      const session = sessions[joinedSession];
      session.endTime = null;
      broadcast(joinedSession, { type: "reset" });
    }
  });

  ws.on("close", () => {
    if (joinedSession && sessions[joinedSession]) {
      sessions[joinedSession].clients = sessions[joinedSession].clients.filter(c => c !== ws);
    }
  });
});

// Serve static HTML/JS files from public folder
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
