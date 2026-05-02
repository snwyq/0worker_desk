import WebSocket from 'ws';

interface CdpResponse<T = unknown> {
  id?: number;
  result?: T;
  error?: {
    message: string;
  };
  method?: string;
}

export class RawCdpClient {
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

  private constructor(private readonly socket: WebSocket) {
    this.socket.on('message', (data) => this.handleMessage(data.toString()));
  }

  static connect(endpoint: string, timeoutMs = 10_000): Promise<RawCdpClient> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(endpoint);
      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error(`Raw CDP connection timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      socket.on('open', () => {
        clearTimeout(timeout);
        resolve(new RawCdpClient(socket));
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        reject(new Error('Raw CDP websocket error'));
      });
    });
  }

  send<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });
    });
  }

  close() {
    this.socket.close();
  }

  private handleMessage(data: string) {
    const message = JSON.parse(data) as CdpResponse;
    if (!message.id) {
      return;
    }

    const pending = this.pending.get(message.id);
    if (!pending) {
      return;
    }

    this.pending.delete(message.id);
    if (message.error) {
      pending.reject(new Error(message.error.message));
      return;
    }

    pending.resolve(message.result);
  }
}

interface TargetInfo {
  targetId: string;
  type: string;
  title: string;
  url: string;
}

export async function inspectFirstPage(endpoint: string) {
  const client = await RawCdpClient.connect(endpoint);
  try {
    const targets = await client.send<{ targetInfos: TargetInfo[] }>('Target.getTargets');
    const pages = targets.targetInfos.filter((target) => target.type === 'page');
    const weiboPages = pages.filter((target) => target.url.includes('weibo.com'));
    const page = weiboPages.find((target) => !target.url.includes('newlogin') && !target.url.includes('passport.weibo'))
      ?? weiboPages[0]
      ?? pages[0];
    return {
      title: page?.title ?? '',
      url: page?.url ?? '',
    };
  } finally {
    client.close();
  }
}
