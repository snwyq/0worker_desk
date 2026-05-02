import WebSocket from 'ws';

const endpoint = process.argv[2];
if (!endpoint) {
  console.error('Usage: node scripts/inspect-weibo-page.mjs <page-websocket-endpoint>');
  process.exit(1);
}

let nextId = 1;
const pending = new Map();
const socket = new WebSocket(endpoint);

function send(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
}

socket.on('message', (data) => {
  const message = JSON.parse(data.toString());
  if (!message.id) return;
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(message.error.message));
  else waiter.resolve(message.result);
});

socket.on('open', async () => {
  try {
    await send('Runtime.enable');
    const expression = `(() => {
      const compact = (value) => String(value || '').replace(/\\s+/g, ' ').trim().slice(0, 120);
      const editable = [...document.querySelectorAll('[contenteditable="true"], textarea, input')]
        .map((el) => ({
          tag: el.tagName,
          text: compact(el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('placeholder')),
          cls: compact(el.className),
          role: el.getAttribute('role') || '',
          placeholder: el.getAttribute('placeholder') || '',
          rect: (() => {
            const r = el.getBoundingClientRect();
            return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
          })(),
        }))
        .filter((item) => item.rect.w > 0 && item.rect.h > 0);
      const buttons = [...document.querySelectorAll('button, [role="button"], a')]
        .map((el) => ({
          tag: el.tagName,
          text: compact(el.innerText || el.getAttribute('aria-label') || el.title),
          cls: compact(el.className),
          role: el.getAttribute('role') || '',
          href: el.getAttribute('href') || '',
          rect: (() => {
            const r = el.getBoundingClientRect();
            return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
          })(),
        }))
        .filter((item) => item.rect.w > 0 && item.rect.h > 0)
        .slice(0, 80);
      return { url: location.href, title: document.title, editable, buttons };
    })()`;
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    console.log(JSON.stringify(result.result.value, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    socket.close();
  }
});
