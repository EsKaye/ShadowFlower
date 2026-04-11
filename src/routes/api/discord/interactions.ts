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

  // TODO: Check role IDs if configured (requires fetching guild member data)
  // This would need Discord API calls which are not implemented yet

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
  _config: ReturnType<typeof getConfig>
): Promise<DiscordInteractionResponse> {
  // TODO: Integrate with GameDin to fetch queue information
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: 'Queue information not yet implemented',
      flags: 64, // Ephemeral
    },
  };
}

/**
 * Handle /shadowflower summary command
 */
async function handleSummaryCommand(
  _interaction: DiscordInteraction,
  _config: ReturnType<typeof getConfig>
): Promise<DiscordInteractionResponse> {
  const reportId = _interaction.data?.options?.find((opt: { name: string }) => opt.name === 'report_id')?.value as string;

  if (!reportId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Please provide a report ID',
        flags: 64, // Ephemeral
      },
    };
  }

  // TODO: Integrate with GameDin to fetch report summary
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `Summary for report ${reportId} not yet implemented`,
      flags: 64, // Ephemeral
    },
  };
}

/**
 * Handle /shadowflower review command
 */
async function handleReviewCommand(
  _interaction: DiscordInteraction,
  _config: ReturnType<typeof getConfig>
): Promise<DiscordInteractionResponse> {
  const reportId = _interaction.data?.options?.find((opt: { name: string }) => opt.name === 'report_id')?.value as string;

  if (!reportId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Please provide a report ID',
        flags: 64, // Ephemeral
      },
    };
  }

  // TODO: Integrate with GameDin to mark report as reviewed
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `Review action for report ${reportId} not yet implemented`,
      flags: 64, // Ephemeral
    },
  };
}

/**
 * Handle /shadowflower dismiss command
 */
async function handleDismissCommand(
  _interaction: DiscordInteraction,
  _config: ReturnType<typeof getConfig>
): Promise<DiscordInteractionResponse> {
  const reportId = _interaction.data?.options?.find((opt: { name: string }) => opt.name === 'report_id')?.value as string;

  if (!reportId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Please provide a report ID',
        flags: 64, // Ephemeral
      },
    };
  }

  // TODO: Integrate with GameDin to dismiss report
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `Dismiss action for report ${reportId} not yet implemented`,
      flags: 64, // Ephemeral
    },
  };
}

/**
 * Handle /shadowflower escalate command
 */
async function handleEscalateCommand(
  _interaction: DiscordInteraction,
  _config: ReturnType<typeof getConfig>
): Promise<DiscordInteractionResponse> {
  const reportId = _interaction.data?.options?.find((opt: { name: string }) => opt.name === 'report_id')?.value as string;

  if (!reportId) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Please provide a report ID',
        flags: 64, // Ephemeral
      },
    };
  }

  // TODO: Integrate with GameDin to escalate report
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `Escalate action for report ${reportId} not yet implemented`,
      flags: 64, // Ephemeral
    },
  };
}
