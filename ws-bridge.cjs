const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3055 });

wss.on('listening', () => {
  console.log('WebSocket bridge running on port 3055');
});

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('message', (msg) => {
    const data = msg.toString();
    console.log('Received:', data.substring(0, 100));
    wss.clients.forEach((c) => {
      if (c !== ws && c.readyState === WebSocket.OPEN) {
        c.send(data);
      }
    });
  });
  ws.on('close', () => console.log('Client disconnected'));
});
