import {GuildManager} from 'discord.js';
import {DependencyContainer} from 'tsyringe';
import GlobalSettingsWrapper from '../../database/wrappers/GlobalSettingsWrapper';
import StaticImplements from '../../utils/StaticImplements';
import CommandModule from '../command/CommandModule';
import Module from '../Module';
import {ModuleConstructor} from '../ModuleConstructor';
import ModuleLoader from '../ModuleLoader';
import MoveCommand from './commands/MoveCommand';
import VcMoverGuildSettingsManager from './settings/VcMoverGuildSettingsManager';

@StaticImplements<ModuleConstructor>()
export default class VcMoverModule extends Module {
  static readonly moduleName = 'vc mover';

  static readonly requiredDependencies = [CommandModule];

  static readonly optionalDependencies = [];

  private readonly guildSettingsManager: VcMoverGuildSettingsManager;

  private commandModule!: CommandModule;

  constructor(moduleContainer: DependencyContainer) {
    super(moduleContainer);

    this.container.registerSingleton(VcMoverGuildSettingsManager);
    this.guildSettingsManager = this.container.resolve(VcMoverGuildSettingsManager);
  }

  async preInitialize(): Promise<void> {
    await this.guildSettingsManager.initialize();
  }

  async initialize(moduleLoader: ModuleLoader): Promise<void> {
    this.commandModule = moduleLoader.getModule(CommandModule);

    this.commandModule.rootCategory.registerCommand(
      new MoveCommand(
        this.container.resolve(GlobalSettingsWrapper),
        this.guildSettingsManager,
        this.container.resolve(GuildManager)
      )
    );
  }
}
