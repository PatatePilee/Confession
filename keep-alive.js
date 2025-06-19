const http = require("http");

// Serveur simple pour maintenir Replit éveillé
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("🤖 Bot Discord actif !\n");
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🌐 Serveur keep-alive actif sur le port ${PORT}`);
});

module.exports = server;
