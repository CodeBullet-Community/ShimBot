import GlobalSettingsWrapper from '@/database/wrappers/GlobalSettingsWrapper';
import CommandCacheManager from '@/modules/command/cache/CommandCacheManager';
import {GenericCommandCommandCache} from '@/modules/command/cache/CommandCacheWrapper';
import ReactionListenerManager from '@/modules/command/cache/listeners/ReactionListenerManager';
import ResponseListenerManager from '@/modules/command/cache/listeners/ResponseListenerManager';
import Command from '@/modules/command/command/Command';
import MissingParameterError from '@/modules/command/errors/MissingParameterError';
import ExecutionContext from '@/modules/command/executionContexts/ExecutionContext';
import GuildMemberContext from '@/modules/command/executionContexts/guild/GuildMemberContext';
import ReactionExecutionContext, {
  ReactionAction,
} from '@/modules/command/executionContexts/ReactionExecutionContext';
import channelParser from '@/modules/command/parsers/channelParser';
import {guildMemberParser} from '@/modules/command/parsers/guildMemberParser';
import InitialExecutionContext from '@/modules/command/executionContexts/InitialExecutionContext';
import MessageType from '@/modules/command/message/MessageType';
import dayjs from 'dayjs';
import {GuildManager, GuildMember, Message, Permissions, VoiceChannel} from 'discord.js';
import VcMoverGuildSettingsManager from '../settings/VcMoverGuildSettingsManager';
import MoveCommandCacheWrapper, {MoveCommandCache} from './MoveCommandCacheWrapper';

export default class MoveCommand extends Command<MoveCommandCacheWrapper, Record<string, never>> {
  readonly name = 'move';

  readonly isDmCapable = false;

  readonly isGuildCapable = true;

  readonly isBotMasterOnly = false;

  private readonly guildSettingsManager: VcMoverGuildSettingsManager;

  private readonly guildManager: GuildManager;

  constructor(
    globalSettings: GlobalSettingsWrapper,
    guildSettingsManager: VcMoverGuildSettingsManager,
    guildManager: GuildManager
  ) {
    super(globalSettings);
    this.guildSettingsManager = guildSettingsManager;
    this.guildManager = guildManager;
  }

  async wrapCacheEntity(
    manager: CommandCacheManager,
    entity: GenericCommandCommandCache<MoveCommandCache>,
    responseListenerManager: ResponseListenerManager,
    reactionListenerManager: ReactionListenerManager
  ): Promise<MoveCommandCacheWrapper> {
    const guild = await this.guildManager.fetch(entity.cache.destinationGuildId);
    const member = await guild.members.fetch(entity.cache.userId);
    const destination = guild.channels.cache.get(entity.cache.destinationChannelId);
    if (!destination) throw new Error(`Destination channel was not found.`);
    if (!(destination instanceof VoiceChannel))
      throw new Error(`Destination channel is not a voice channel.`);
    return new MoveCommandCacheWrapper(
      manager,
      entity,
      this,
      responseListenerManager,
      reactionListenerManager,
      member,
      destination
    );
  }

  async execute(
    context: ExecutionContext<MoveCommandCacheWrapper, Record<string, never>, this>
  ): Promise<void> {
    if (context instanceof InitialExecutionContext) {
      await this.checkContextValidity(context);
      if (!context.hasGuildContext()) return;

      const guildSettings = await this.guildSettingsManager.fetch(context.guild.guild);
      if (!guildSettings.isEnabled) return;

      if (context.parser.remain.length === 0) {
        await context.sender.sendDetailed(
          `Move Command`,
          `Move members into a voice channel they don't have access to with their consent.\n\n` +
            `This command has the following syntax:\n` +
            `\`${context.parser.values.prefix}${this.name} <member to move> [destination channel]\``
        );
        return;
      }

      const member = await context.parser.nextValue(guildMemberParser(context.guild.guild.members));
      if (!member) throw new MissingParameterError(context.sender, 'member to move');
      if (member.user === context.user) context.sender.throwError(`You cannot move yourself.`);
      if (!member.voice.channel)
        context.sender.throwError(`${member} is not in a voice channel of this server.`);

      const channel = await this.getDestination(context);

      if (!MoveCommand.hasConnectPermission(context.guild.member, channel))
        context.sender.throwError(`You yourself don't have permission to connect to ${channel}.`);
      if (member.voice.channel === channel)
        context.sender.throwError(`${member} already is in ${channel}.`);
      if (MoveCommand.hasConnectPermission(member, channel))
        context.sender.throwError(`${member} already has access to ${channel}.`);

      const dmSender = context.createSender(await member.user.createDM());
      let dmMessage: Message;
      try {
        dmMessage = await dmSender.sendDetailed(
          'Voice Channel Move Request',
          `${context.user} requested me to move you to the **${channel.name}** voice channel in **${channel.guild.name}**. Do you accept or reject this request?`,
          {
            type: MessageType.Question,
            reactionOptions: [
              {emoji: '✅', description: `accept request`},
              {emoji: '❌', description: `reject request`},
            ],
          }
        );
      } catch {
        context.sender.throwError(`Couldn't DM ${member} the move request to ${channel}.`);
        return;
      }
      const cache = await context.createCache(dayjs().add(15, 'minutes'), {
        destinationGuildId: context.guild.guild.id,
        destinationChannelId: channel.id,
        userId: member.id,
      });
      await Promise.all([
        cache.addReactionListener(dmMessage, member, '✅', ReactionAction.Add),
        cache.addReactionListener(dmMessage, member, '❌', ReactionAction.Add),
      ]);

      await context.sender.send(`Move request to ${channel} has been sent to ${member}.`, {
        type: MessageType.Success,
      });
    }

    if (!(context instanceof ReactionExecutionContext)) return;
    const isAccepted = context.reaction.emoji.name === '✅';
    await context.reaction.message.delete();
    let action: string;
    let isSuccess: boolean;
    if (!isAccepted) {
      action = 'rejected';
      isSuccess = false;
    } else {
      try {
        await context.cache.member.voice.setChannel(context.cache.destination, 'move request');
        action = 'accepted';
        isSuccess = true;
      } catch {
        action = 'failed';
        isSuccess = false;
      }
    }
    await context.sender.send(
      `Voice channel move request to **${context.cache.destination.name}** in **${context.cache.destination.guild.name}** ${action}.`,
      {type: isSuccess ? MessageType.Success : MessageType.Error}
    );
    await context.cache.delete();
  }

  private static hasConnectPermission(member: GuildMember, channel: VoiceChannel): boolean {
    const permissions = channel.permissionsFor(member);
    if (!permissions) throw new Error(`Could not get voice channel permissions for member.`);
    return permissions.has(Permissions.FLAGS.CONNECT);
  }

  // eslint-disable-next-line class-methods-use-this
  private async getDestination(
    context: InitialExecutionContext<
      MoveCommandCacheWrapper,
      Record<string, never>,
      this,
      GuildMemberContext
    >
  ): Promise<VoiceChannel> {
    const channel = await context.parser.nextValue(
      channelParser(context.guild.guild.channels.cache, {nameTypeFilter: [VoiceChannel]})
    );
    if (!channel) {
      if (context.parser.remain.length === 0 && context.guild.member.voice.channel)
        return context.guild.member.voice.channel;
      throw new MissingParameterError(context.sender, 'destination channel');
    }
    if (!(channel instanceof VoiceChannel))
      context.sender.throwError('Specified destination is not a voice channel.');
    return channel;
  }
}
