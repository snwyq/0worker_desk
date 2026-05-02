import WebSocket from 'ws';

const endpoint = process.argv[2];
if (!endpoint) {
  console.error('Usage: node scripts/inspect-weibo-upload.mjs <page-websocket-endpoint>');
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
      const compact = (value) => String(value || '').replace(/\\s+/g, ' ').trim().slice(0, 160);
      const files = [...document.querySelectorAll('input[type="file"]')].map((el, index) => ({
        index,
        accept: el.getAttribute('accept') || '',
        multiple: el.multiple,
        name: el.getAttribute('name') || '',
        cls: compact(el.className),
        hidden: el.hidden,
        style: el.getAttribute('style') || '',
        rect: (() => {
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
        })(),
      }));
      const uploadish = [...document.querySelectorAll('button, [role="button"], a, label, div')]
        .map((el) => ({
          tag: el.tagName,
          text: compact(el.innerText || el.getAttribute('aria-label') || el.title),
          cls: compact(el.className),
          role: el.getAttribute('role') || '',
          forAttr: el.getAttribute('for') || '',
          rect: (() => {
            const r = el.getBoundingClientRect();
            return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
          })(),
        }))
        .filter((item) => /图|图片|相册|视频|上传|photo|image|video/i.test(item.text + ' ' + item.cls + ' ' + item.role))
        .slice(0, 80);
      return { url: location.href, title: document.title, files, uploadish };
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
