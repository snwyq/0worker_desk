const endpoint = process.argv[2];
if (!endpoint) {
  console.error('Usage: node scripts/probe-cdp-raw.mjs <endpoint>');
  process.exit(1);
}

const socket = new WebSocket(endpoint);
const timeout = setTimeout(() => {
  console.log(JSON.stringify({ ok: false, message: 'raw CDP timed out' }));
  socket.close();
  process.exit(0);
}, 10_000);

socket.addEventListener('open', () => {
  socket.send(JSON.stringify({ id: 1, method: 'Target.getTargets' }));
});

socket.addEventListener('message', (event) => {
  clearTimeout(timeout);
  console.log(String(event.data));
  socket.close();
});

socket.addEventListener('error', () => {
  clearTimeout(timeout);
  console.log(JSON.stringify({ ok: false, message: 'raw CDP websocket error' }));
});
