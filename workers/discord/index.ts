/**
 * Discord interaction endpoint for slash commands
 * Cloudflare Workers implementation
 */

export { DiscordGateway } from './gateway';

export interface Env {
  DISCORD_APPLICATION_ID: string;
  DISCORD_PUBLIC_KEY: string;
  SHADOWFLOWER: KVNamespace;
  GATEWAY: DurableObjectNamespace;
}

type KVNamespace = {
  get(key: string, type?: 'text' | 'json' | 'arrayBuffer' | 'stream'): Promise<any>;
  put(key: string, value: any, options?: any): Promise<void>;
  delete(key: string): Promise<void>;
};

type DurableObjectNamespace = {
  get(id: string): Promise<DurableObjectStub>;
  idFromName(name: string): Promise<string>;
};

type DurableObjectStub = {
  fetch(request: Request): Promise<Response>;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    console.log('Request pathname:', url.pathname);

    // Handle gateway routes
    if (url.pathname === '/gateway/connect' || url.pathname === '/gateway/disconnect' || url.pathname === '/gateway/status') {
      console.log('Routing to gateway');
      try {
        const gatewayId = await env.GATEWAY.idFromName('discord-gateway');
        console.log('Gateway ID:', gatewayId);
        const gateway = await env.GATEWAY.get(gatewayId);
        console.log('Gateway stub obtained');
        return gateway.fetch(request);
      } catch (error) {
        console.error('Gateway error:', error);
        return new Response('Gateway error: ' + error, { status: 500 });
      }
    }

    // Handle logo request
    if (url.pathname === '/logo.png') {
      const logoData = await env.SHADOWFLOWER.get('logo.png', 'arrayBuffer');
      if (logoData) {
        return new Response(logoData, {
          headers: { 'Content-Type': 'image/png' },
        });
      }
      return new Response('Logo not found', { status: 404 });
    }

    // Handle favicon request
    if (url.pathname === '/favicon.ico') {
      return new Response(null, { status: 404 });
    }

    // Handle OPTIONS preflight request
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Handle GET requests (for browser visits, etc.)
    if (request.method === 'GET') {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>ShadowFlower Discord Bot</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #1a1a1a;
            }
            img {
              max-width: 200px;
              max-height: 200px;
            }
          </style>
        </head>
        <body>
          <img src="/logo.png" alt="GameDin Logo" />
        </body>
        </html>
      `;
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }

    // Handle POST requests (Discord interactions)
    if (request.method === 'POST') {
      const body = await request.text();

      try {
        // Verify signature first (per Discord documentation)
        const signature = request.headers.get('x-signature-ed25519');
        const timestamp = request.headers.get('x-signature-timestamp');

        if (!signature || !timestamp) {
          return new Response('Bad request signature.', { status: 401 });
        }

        // Proper Ed25519 signature verification
        const message = timestamp + body;
        const signatureBytes = new Uint8Array(Buffer.from(signature, 'hex'));
        const publicKeyBytes = new Uint8Array(Buffer.from(env.DISCORD_PUBLIC_KEY, 'hex'));

        // Use Web Crypto API for Ed25519 verification
        const messageBytes = new TextEncoder().encode(message);
        const isValid = await crypto.subtle.verify(
          'Ed25519',
          await crypto.subtle.importKey(
            'raw',
            publicKeyBytes,
            { name: 'Ed25519' },
            false,
            ['verify']
          ),
          signatureBytes,
          messageBytes
        );

        if (!isValid) {
          return new Response('Bad request signature.', { status: 401 });
        }

        const interaction = JSON.parse(body);

        // Handle PING interactions
        if (interaction.type === 1) {
          return new Response(JSON.stringify({ type: 1 }), {
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }

        // Handle APPLICATION_COMMAND interactions
        if (interaction.type === 2) {
          const commandName = interaction.data.name;
          return new Response(JSON.stringify({
            type: 4,
            data: { content: `Command ${commandName} received` },
          }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ error: 'Unknown Type' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Unknown Type' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Method not allowed', { status: 405 });
  },
};
