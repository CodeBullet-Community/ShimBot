import {VcMoverGuildSettings} from '@prisma/client';
import {Guild} from 'discord.js';
import {SyncStream} from '../../../database/synchronizer/CacheSynchronizer';
import SynchronizedEntityWrapper from '../../../database/wrapper/SynchronizedEntityWrapper';
import type VcMoverGuildSettingsManager from './VcMoverGuildSettingsManager';

export default class VcMoverGuildSettingsWrapper extends SynchronizedEntityWrapper<
  VcMoverGuildSettings | undefined,
  VcMoverGuildSettingsManager
> {
  readonly guild: Guild;

  get isEnabled(): boolean {
    return this.entity?.isEnabled ?? false;
  }

  set isEnabled(value: boolean) {
    this.updateEntity({isEnabled: value});
  }

  constructor(
    manager: VcMoverGuildSettingsManager,
    syncStream: SyncStream<VcMoverGuildSettings>,
    entity: VcMoverGuildSettings | undefined,
    guild: Guild
  ) {
    super(manager, syncStream, entity);
    this.guild = guild;
  }

  protected createDefaultEntity(): VcMoverGuildSettings {
    return {
      guildId: this.guild.id,
      isEnabled: false,
    };
  }

  async save(): Promise<void> {
    if (!this.isEnabled) {
      await this.manager.model.delete({
        where: {
          guildId: this.guild.id,
        },
      });
      return;
    }
    await this.manager.model.upsert({
      create: this.entity as VcMoverGuildSettings,
      update: this.entity as VcMoverGuildSettings,
      where: {
        guildId: this.guild.id,
      },
    });
  }
}
