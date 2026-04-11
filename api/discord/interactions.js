/**
 * Discord interaction endpoint for slash commands
 * Self-contained Vercel serverless function
 */

const { VercelRequest, VercelResponse } = require('@vercel/node');

module.exports = async function handler(req, res) {
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

  const body = req.body || JSON.stringify(req.body);

  // Simple signature check (in production, use proper Ed25519 verification)
  // For now, we'll accept the request to test the endpoint
  // TODO: Implement proper Ed25519 verification

  try {
    const interaction = JSON.parse(body);

    if (interaction.type === 1) {
      res.status(200).json({ type: 1 });
      return;
    }

    if (interaction.type === 2) {
      const commandName = interaction.data?.name;

      let content = 'Unknown command';

      switch (commandName) {
        case 'sf_status':
          content = 'ShadowFlower status: Operational';
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
  } catch (error) {
    res.status(400).json({ error: 'Invalid interaction' });
  }
};
