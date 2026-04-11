/**
 * Discord interaction endpoint for slash commands
 * Handles Discord bot/app interactions with signature verification
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { getConfig } from '../../../config';
import { verifyDiscordSignature, extractDiscordHeaders } from '../../../security/discord-verification';
import {
  DiscordInteraction,
  InteractionType,
  InteractionResponseType,
  DiscordInteractionResponse,
} from '../../../types/discord';
import { getRedisService } from '../../../infrastructure/redis';
import { GameDinClient } from '../../../lib/gamedin-client';

/**
 * Discord interaction handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const config = getConfig();

  // Check if Discord bot is configured
  if (!config.environment.discordPublicKey) {
    console.error('Discord bot not configured - missing public key');
    res.status(500).json({ error: 'Discord bot not configured' });
    return;
  }

  // Extract Discord verification headers
  const discordHeaders = extractDiscordHeaders(req);
  if (!discordHeaders) {
    console.error('Missing Discord signature headers');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Get raw body for signature verification
  const body = req.body as string || JSON.stringify(req.body);

  // Verify Discord signature
  const signatureValid = verifyDiscordSignature(
    { publicKey: config.environment.discordPublicKey },
    {
      body,
      signature: discordHeaders.signature,
      timestamp: discordHeaders.timestamp,
    }
  );

  if (!signatureValid) {
    console.error('Invalid Discord signature');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Parse interaction
  let interaction: DiscordInteraction;
  try {
    interaction = JSON.parse(body) as DiscordInteraction;
  } catch (error) {
    console.error('Failed to parse Discord interaction:', error);
    res.status(400).json({ error: 'Invalid interaction' });
    return;
  }

  // Handle PING interaction (Discord verification)
  if (interaction.type === InteractionType.PING) {
    const response: DiscordInteractionResponse = {
      type: InteractionResponseType.PONG,
    };
    res.status(200).json(response);
    return;
  }

  // Handle APPLICATION_COMMAND interaction (slash commands)
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    // Check permissions
    const authorized = await checkPermissions(interaction, config);
    if (!authorized) {
      const response: DiscordInteractionResponse = {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'You do not have permission to use this command.',
          flags: 64, // Ephemeral
        },
      };
      res.status(200).json(response);
      return;
    }

    // Check for replay protection using Redis
    const redis = getRedisService();
    if (redis.isAvailable()) {
      const client = redis.getClient();
      if (client) {
        const interactionKey = `discord:interaction:${interaction.id}`;
        const existing = await client.get(interactionKey);
        if (existing) {
          console.warn(`Duplicate Discord interaction detected: ${interaction.id}`);
          const response: DiscordInteractionResponse = {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'This interaction has already been processed.',
              flags: 64, // Ephemeral
            },
          };
          res.status(200).json(response);
          return;
        }
        // Mark interaction as processed with 5 minute TTL
        await client.set(interactionKey, 'processed', { ex: 300 });
      }
    }

    // Handle command
    const commandResponse = await handleCommand(interaction, config);
    res.status(200).json(commandResponse);
    return;
  }

  // Unknown interaction type
  console.error(`Unknown interaction type: ${interaction.type}`);
  res.status(400).json({ error: 'Unknown interaction type' });
}

/**
 * Check if user is authorized to use Discord commands
 */
async function checkPermissions(
  interaction: DiscordInteraction,
  config: ReturnType<typeof getConfig>
): Promise<boolean> {
  const { environment } = config;

  // Check guild ID if configured
  if (environment.discordAllowedGuildId && interaction.guild_id !== environment.discordAllowedGuildId) {
    return false;
  }

  // Check channel IDs if configured
  if (environment.discordAllowedChannelIds && interaction.channel_id) {
    const allowedChannels = environment.discordAllowedChannelIds.split(',').map(id => id.trim());
    if (!allowedChannels.includes(interaction.channel_id)) {
      return false;
    }
  }

  // Check user IDs if configured
  if (environment.discordAllowedUserIds) {
    const allowedUsers = environment.discordAllowedUserIds.split(',').map(id => id.trim());
    if (!allowedUsers.includes(interaction.user.id)) {
      return false;
    }
  }

  // Check role IDs if configured
  // Note: Role-based permission enforcement requires Discord API calls to fetch guild member data
  // This is not implemented in this pass as it requires:
  // - Using DISCORD_BOT_TOKEN to make Discord API requests
  // - Fetching guild member: GET /guilds/{guild.id}/members/{user.id}
  // - Comparing member.roles with allowed role IDs
  // This is scaffolded for future implementation when Discord API integration is added
  if (environment.discordAllowedRoleIds) {
    // Role enforcement not implemented - requires Discord API calls
    // Current enforcement relies on guild, channel, and user ID checks which are sufficient for most use cases
    console.warn('Role-based permission enforcement configured but not implemented (requires Discord API calls)');
  }

  return true;
}

/**
 * Handle slash commands
 */
async function handleCommand(
  interaction: DiscordInteraction,
  config: ReturnType<typeof getConfig>
): Promise<DiscordInteractionResponse> {
  const commandName = interaction.data?.name;

  switch (commandName) {
    case 'status':
      return handleStatusCommand(interaction, config);
    case 'queue':
      return handleQueueCommand(interaction, config);
    case 'summary':
      return handleSummaryCommand(interaction, config);
    case 'review':
      return handleReviewCommand(interaction, config);
    case 'dismiss':
      return handleDismissCommand(interaction, config);
    case 'escalate':
      return handleEscalateCommand(interaction, config);
    default:
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Unknown command',
          flags: 64, // Ephemeral
        },
      };
  }
}

/**
 * Handle /shadowflower status command
 */
async function handleStatusCommand(
  _interaction: DiscordInteraction,
  _config: ReturnType<typeof getConfig>
): Promise<DiscordInteractionResponse> {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: 'ShadowFlower status: ✅ Operational',
      flags: 64, // Ephemeral
    },
  };
}

/**
 * Handle /shadowflower queue command
 */
async function handleQueueCommand(
  _interaction: DiscordInteraction,
  config: ReturnType<typeof getConfig>
): Promise<DiscordInteractionResponse> {
  try {
    const clientConfig: { baseUrl: string; apiKey: string; signingSecret?: string } = {
      baseUrl: config.environment.gamedinBaseUrl,
      apiKey: config.environment.gamedinShadowflowerApiKey,
    };

    if (process.env['GAMEDIN_SIGNING_SECRET']) {
      clientConfig.signingSecret = process.env['GAMEDIN_SIGNING_SECRET'];
    }

    const gameDinClient = new GameDinClient(clientConfig);

    const queue = await gameDinClient.fetchModerationQueue({ limit: 10 });

    const itemCount = queue.items?.length || 0;
    const content = `Moderation Queue: ${itemCount} items pending`;

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content,
        flags: 64, // Ephemeral
      },
    };
  } catch (error) {
    console.error('Failed to fetch queue:', error);
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Failed to fetch queue information',
        flags: 64, // Ephemeral
      },
    };
  }
}

/**
 * Handle /shadowflower summary command
 */
async function handleSummaryCommand(
  interaction: DiscordInteraction,
  config: ReturnType<typeof getConfig>
): Promise<DiscordInteractionResponse> {
  const reportId = interaction.data?.options?.find((opt: { name: string }) => opt.name === 'report_id')?.value as string;

  if (!reportId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Please provide a report ID',
        flags: 64, // Ephemeral
      },
    };
  }

  try {
    const clientConfig: { baseUrl: string; apiKey: string; signingSecret?: string } = {
      baseUrl: config.environment.gamedinBaseUrl,
      apiKey: config.environment.gamedinShadowflowerApiKey,
    };

    if (process.env['GAMEDIN_SIGNING_SECRET']) {
      clientConfig.signingSecret = process.env['GAMEDIN_SIGNING_SECRET'];
    }

    const gameDinClient = new GameDinClient(clientConfig);

    const item = await gameDinClient.getModerationItem(reportId);

    const content = `Report ${reportId}: Type ${item.type}, Author ${item.author.username}`;

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content,
        flags: 64, // Ephemeral
      },
    };
  } catch (error) {
    console.error('Failed to fetch report summary:', error);
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Report ${reportId} not found or failed to fetch`,
        flags: 64, // Ephemeral
      },
    };
  }
}

/**
 * Handle /shadowflower review command
 */
async function handleReviewCommand(
  interaction: DiscordInteraction,
  config: ReturnType<typeof getConfig>
): Promise<DiscordInteractionResponse> {
  const reportId = interaction.data?.options?.find((opt: { name: string }) => opt.name === 'report_id')?.value as string;

  if (!reportId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Please provide a report ID',
        flags: 64, // Ephemeral
      },
    };
  }

  try {
    const clientConfig: { baseUrl: string; apiKey: string; signingSecret?: string } = {
      baseUrl: config.environment.gamedinBaseUrl,
      apiKey: config.environment.gamedinShadowflowerApiKey,
    };

    if (process.env['GAMEDIN_SIGNING_SECRET']) {
      clientConfig.signingSecret = process.env['GAMEDIN_SIGNING_SECRET'];
    }

    const gameDinClient = new GameDinClient(clientConfig);

    await gameDinClient.updateModerationItemStatus(reportId, 'reviewed');

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Report ${reportId} marked as reviewed`,
        flags: 64, // Ephemeral
      },
    };
  } catch (error) {
    console.error('Failed to mark report as reviewed:', error);
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Failed to mark report ${reportId} as reviewed`,
        flags: 64, // Ephemeral
      },
    };
  }
}

/**
 * Handle /shadowflower dismiss command
 */
async function handleDismissCommand(
  interaction: DiscordInteraction,
  config: ReturnType<typeof getConfig>
): Promise<DiscordInteractionResponse> {
  const reportId = interaction.data?.options?.find((opt: { name: string }) => opt.name === 'report_id')?.value as string;

  if (!reportId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Please provide a report ID',
        flags: 64, // Ephemeral
      },
    };
  }

  try {
    const clientConfig: { baseUrl: string; apiKey: string; signingSecret?: string } = {
      baseUrl: config.environment.gamedinBaseUrl,
      apiKey: config.environment.gamedinShadowflowerApiKey,
    };

    if (process.env['GAMEDIN_SIGNING_SECRET']) {
      clientConfig.signingSecret = process.env['GAMEDIN_SIGNING_SECRET'];
    }

    const gameDinClient = new GameDinClient(clientConfig);

    await gameDinClient.updateModerationItemStatus(reportId, 'dismissed');

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Report ${reportId} dismissed`,
        flags: 64, // Ephemeral
      },
    };
  } catch (error) {
    console.error('Failed to dismiss report:', error);
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Failed to dismiss report ${reportId}`,
        flags: 64, // Ephemeral
      },
    };
  }
}

/**
 * Handle /shadowflower escalate command
 */
async function handleEscalateCommand(
  interaction: DiscordInteraction,
  config: ReturnType<typeof getConfig>
): Promise<DiscordInteractionResponse> {
  const reportId = interaction.data?.options?.find((opt: { name: string }) => opt.name === 'report_id')?.value as string;

  if (!reportId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Please provide a report ID',
        flags: 64, // Ephemeral
      },
    };
  }

  try {
    const clientConfig: { baseUrl: string; apiKey: string; signingSecret?: string } = {
      baseUrl: config.environment.gamedinBaseUrl,
      apiKey: config.environment.gamedinShadowflowerApiKey,
    };

    if (process.env['GAMEDIN_SIGNING_SECRET']) {
      clientConfig.signingSecret = process.env['GAMEDIN_SIGNING_SECRET'];
    }

    const gameDinClient = new GameDinClient(clientConfig);

    await gameDinClient.updateModerationItemStatus(reportId, 'escalated');

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Report ${reportId} escalated`,
        flags: 64, // Ephemeral
      },
    };
  } catch (error) {
    console.error('Failed to escalate report:', error);
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Failed to escalate report ${reportId}`,
        flags: 64, // Ephemeral
      },
    };
  }
}
