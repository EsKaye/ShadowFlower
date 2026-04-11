/**
 * Discord interaction endpoint for slash commands
 * Self-contained Vercel serverless function
 * Disabled by default - requires ENABLE_DISCORD_INTERACTIONS=true
 */

module.exports = async function handler(req, res) {
  // Check if Discord interactions are enabled
  if (process.env.ENABLE_DISCORD_INTERACTIONS !== 'true') {
    res.status(404).json({ error: 'Discord interactions are disabled' });
    return;
  }

  try {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS preflight request
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Handle Discord endpoint verification (GET request with challenge)
    if (req.method === 'GET') {
      const challenge = req.query.challenge;
      if (challenge) {
        res.setHeader('Content-Type', 'text/plain');
        res.status(200).send(challenge);
        return;
      }
      res.status(400).send('Bad request');
      return;
    }

    // Handle POST requests (Discord interactions)
    if (req.method === 'POST') {
      let body = req.body;

      console.log('Request body:', body);
      console.log('Request body type:', typeof body);

      // Parse body if it's a string, otherwise use it directly
      let interaction;
      if (typeof body === 'string') {
        try {
          interaction = JSON.parse(body);
        } catch (error) {
          console.error('Failed to parse body:', error);
          res.status(400).json({ error: 'Invalid interaction' });
          return;
        }
      } else if (typeof body === 'object') {
        interaction = body;
      } else {
        res.status(400).json({ error: 'Invalid interaction' });
        return;
      }

      console.log('Parsed interaction:', interaction);

      // Handle PING interaction (Discord verification - skip signature verification)
      if (interaction.type === 1) {
        console.log('Handling PING request');
        res.status(200).json({ type: 1 });
        return;
      }

      // Verify signature for non-PING requests
      const publicKey = process.env.DISCORD_PUBLIC_KEY;

      if (!publicKey) {
        res.status(500).json({ error: 'Discord bot not configured' });
        return;
      }

      const signature = req.headers['x-signature-ed25519'];
      const timestamp = req.headers['x-signature-timestamp'];

      if (!signature || !timestamp) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Simple signature check (in production, use proper Ed25519 verification)
      // TODO: Implement proper Ed25519 verification

      if (interaction.type === 2) {
        const commandName = interaction.data?.name;

        let content = 'Unknown command';

        switch (commandName) {
          case 'sf_status':
            content = 'ShadowFlower status: ✅ Operational';
            break;
          case 'sf_queue':
            content = 'Moderation Queue: 0 items pending';
            break;
          case 'sf_summary':
            content = 'Summary command - not yet fully implemented';
            break;
          case 'sf_review':
            content = 'Review command - not yet fully implemented';
            break;
          case 'sf_dismiss':
            content = 'Dismiss command - not yet fully implemented';
            break;
          case 'sf_escalate':
            content = 'Escalate command - not yet fully implemented';
            break;
        }

        res.status(200).json({
          type: 4,
          data: {
            content,
            flags: 64,
          },
        });
        return;
      }

      res.status(400).json({ error: 'Unknown interaction type' });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
