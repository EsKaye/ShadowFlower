/**
 * Discord Gateway Durable Object
 * Maintains WebSocket connection to Discord for real-time events
 */

type KVNamespace = {
  get(key: string, type?: 'text' | 'json' | 'arrayBuffer' | 'stream'): Promise<any>;
  put(key: string, value: any, options?: any): Promise<void>;
  delete(key: string): Promise<void>;
};

type DurableObjectState = {
  storage: {
    get(key: string): Promise<any>;
    put(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
    sync<T>(initial: T): T;
  };
  setAlarm(callback: () => Promise<void>, time: number): void;
  alarm(): Promise<void>;
};

export interface Env {
  DISCORD_BOT_TOKEN: string;
  DISCORD_APPLICATION_ID: string;
  DISCORD_PUBLIC_KEY: string;
  SHADOWFLOWER: KVNamespace;
}

export class DiscordGateway {
  private gatewayState: {
    connected: boolean;
    heartbeatInterval?: NodeJS.Timeout;
    lastHeartbeat?: number;
    sessionId?: string;
    resumeUrl?: string;
  };

  constructor(private state: DurableObjectState, private env: Env) {
    this.gatewayState = {
      connected: false,
    };

    // Auto-connect to Discord gateway on initialization
    this.state.setAlarm(this.connect.bind(this), 0);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle HTTP requests for gateway status
    if (url.pathname === '/status') {
      return new Response(JSON.stringify({
        connected: this.gatewayState.connected,
        lastHeartbeat: this.gatewayState.lastHeartbeat,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  }

  async alarm(): Promise<void> {
    await this.connect();
  }

  private async connect(): Promise<void> {
    if (this.gatewayState.connected) {
      return;
    }

    const gatewayUrl = this.gatewayState.resumeUrl || 'wss://gateway.discord.gg/?v=10&encoding=json';

    try {
      const ws = new WebSocket(gatewayUrl);

      ws.addEventListener('open', async () => {
        console.log('Discord Gateway connected');
        this.gatewayState.connected = true;
        await this.state.storage.put('connected', true);

        // Send identify payload
        const identifyPayload = {
          op: 2,
          d: {
            token: this.env.DISCORD_BOT_TOKEN,
            intents: 1 << 0, // GUILD_MESSAGES
            properties: {
              os: 'linux',
              browser: 'shadowflower',
              device: 'shadowflower',
            },
          },
        };
        ws.send(JSON.stringify(identifyPayload));
      });

      ws.addEventListener('message', async (event: MessageEvent) => {
        const data = JSON.parse(event.data);

        switch (data.op) {
          case 0: // DISPATCH
            await this.handleDispatch(data);
            break;
          case 10: // HELLO
            await this.handleHello(data, ws);
            break;
          case 11: // HEARTBEAT_ACK
            this.gatewayState.lastHeartbeat = Date.now();
            await this.state.storage.put('lastHeartbeat', this.gatewayState.lastHeartbeat);
            break;
        }
      });

      ws.addEventListener('error', (error) => {
        console.error('Discord Gateway error:', error);
        this.gatewayState.connected = false;
        this.state.storage.put('connected', false);
      });

      ws.addEventListener('close', async () => {
        console.log('Discord Gateway closed');
        this.gatewayState.connected = false;
        await this.state.storage.put('connected', false);
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.connect(), 5000) as unknown as number;
      });
    } catch (error) {
      console.error('Failed to connect to Discord Gateway:', error);
    }
  }

  private async disconnect(): Promise<void> {
    this.gatewayState.connected = false;
    await this.state.storage.put('connected', false);
    if (this.gatewayState.heartbeatInterval) {
      clearInterval(this.gatewayState.heartbeatInterval);
    }
  }

  private async handleHello(data: any, ws: WebSocket): Promise<void> {
    const heartbeatInterval = data.d.heartbeat_interval;
    this.gatewayState.sessionId = data.d.session_id;
    this.gatewayState.resumeUrl = data.d.resume_url;
    await this.state.storage.put('sessionId', this.gatewayState.sessionId);
    await this.state.storage.put('resumeUrl', this.gatewayState.resumeUrl);

    // Start heartbeat
    this.gatewayState.heartbeatInterval = setInterval(() => {
      ws.send(JSON.stringify({ op: 1, d: this.gatewayState.lastHeartbeat }));
    }, heartbeatInterval);
  }

  private async handleDispatch(data: any): Promise<void> {
    // Handle Discord events
    console.log('Discord event:', data.t);

    if (data.t === 'READY') {
      console.log('Discord bot ready');
    }
  }
}
