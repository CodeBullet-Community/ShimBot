import {Prisma, PrismaClient, VcMoverGuildSettings} from '@prisma/client';
import {GuildManager, GuildResolvable, Snowflake} from 'discord.js';
import {injectable} from 'tsyringe';
import DatabaseEventHub from '../../../database/DatabaseEventHub';
import CacheManager from '../../../database/manager/CacheManager';
import CacheSynchronizer from '../../../database/synchronizer/CacheSynchronizer';
import {resolveIdChecked} from '../../../utils/resolve';
import VcMoverGuildSettingsWrapper from './VcMoverGuildSettingsWrapper';

@injectable()
export default class VcMoverGuildSettingsManager extends CacheManager<
  PrismaClient['vcMoverGuildSettings'],
  Snowflake,
  VcMoverGuildSettingsWrapper
> {
  private readonly synchronizer: CacheSynchronizer<VcMoverGuildSettings, 'guildId', Snowflake>;

  private readonly guildManager: GuildManager;

  constructor(prisma: PrismaClient, guildManager: GuildManager, eventHub: DatabaseEventHub) {
    super(prisma.vcMoverGuildSettings);
    this.guildManager = guildManager;
    this.synchronizer = new CacheSynchronizer(
      eventHub,
      Prisma.ModelName.VcMoverGuildSettings,
      ({guildId}) => guildId
    );
  }

  async initialize(): Promise<void> {
    await this.synchronizer.initialize();
  }

  async fetch(guild: GuildResolvable): Promise<VcMoverGuildSettingsWrapper> {
    const id: Snowflake = resolveIdChecked(this.guildManager, guild);

    const cached = this.cache.get(id);
    if (cached) return cached;

    const syncStream = this.synchronizer.getSyncStream(id);
    const entity = await this.model.findUnique({where: {guildId: id}});
    const wrapper = new VcMoverGuildSettingsWrapper(
      this,
      syncStream,
      entity ?? undefined,
      await this.guildManager.fetch(id)
    );
    wrapper.afterUncache.subscribe(() => this.synchronizer.removeSyncStream(id));
    this.cacheWrapper(id, wrapper);
    return wrapper;
  }
}
