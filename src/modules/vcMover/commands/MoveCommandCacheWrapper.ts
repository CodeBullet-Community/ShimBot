import {GuildMember, Snowflake, VoiceChannel} from 'discord.js';
import CommandCacheManager from '../../command/cache/CommandCacheManager';
import CommandCacheWrapper, {
  GenericCommandCommandCache,
} from '../../command/cache/CommandCacheWrapper';
import ReactionListenerManager from '../../command/cache/listeners/ReactionListenerManager';
import ResponseListenerManager from '../../command/cache/listeners/ResponseListenerManager';
import type MoveCommand from './MoveCommand';

export interface MoveCommandCache {
  readonly userId: Snowflake;
  readonly destinationGuildId: Snowflake;
  readonly destinationChannelId: Snowflake;
}

export default class MoveCommandCacheWrapper extends CommandCacheWrapper<MoveCommandCache> {
  readonly member: GuildMember;

  readonly destination: VoiceChannel;

  constructor(
    manager: CommandCacheManager,
    entity: GenericCommandCommandCache<MoveCommandCache>,
    command: MoveCommand,
    responseListenerManager: ResponseListenerManager,
    reactionListenerManager: ReactionListenerManager,
    member: GuildMember,
    destination: VoiceChannel
  ) {
    super(manager, entity, command, responseListenerManager, reactionListenerManager);
    this.member = member;
    this.destination = destination;
  }
}
