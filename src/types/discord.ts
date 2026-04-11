/**
 * Discord interaction types for slash commands
 */

export interface DiscordInteraction {
  id: string;
  type: number;
  data?: DiscordInteractionData;
  guild_id?: string;
  channel_id?: string;
  user: DiscordUser;
  token: string;
  version: number;
}

export interface DiscordInteractionData {
  name: string;
  type: number;
  options?: DiscordInteractionOption[];
}

export interface DiscordInteractionOption {
  name: string;
  type: number;
  value?: string | number | boolean;
  options?: DiscordInteractionOption[];
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  public_flags?: number;
}

export interface DiscordInteractionResponse {
  type: number;
  data?: DiscordInteractionResponseData;
}

export interface DiscordInteractionResponseData {
  content?: string;
  embeds?: DiscordEmbed[];
  flags?: number;
  ephemeral?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
  };
  timestamp?: string;
}

// Discord interaction types
export enum InteractionType {
  PING = 1,
  APPLICATION_COMMAND = 2,
  MESSAGE_COMPONENT = 3,
  APPLICATION_COMMAND_AUTOCOMPLETE = 4,
  MODAL_SUBMIT = 5,
}

// Discord interaction response types
export enum InteractionResponseType {
  PONG = 1,
  CHANNEL_MESSAGE_WITH_SOURCE = 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5,
  DEFERRED_UPDATE_MESSAGE = 6,
  UPDATE_MESSAGE = 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT = 8,
}

// Discord command option types
export enum ApplicationCommandOptionType {
  SUB_COMMAND = 1,
  SUB_COMMAND_GROUP = 2,
  STRING = 3,
  INTEGER = 4,
  BOOLEAN = 5,
  USER = 6,
  CHANNEL = 7,
  ROLE = 8,
  MENTIONABLE = 9,
  NUMBER = 10,
}
