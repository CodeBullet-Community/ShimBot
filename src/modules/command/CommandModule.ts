import {Client} from 'discord.js';
import {singleton} from 'tsyringe';

import Module from '../Module';
import CommandCategory from './CommandCategory';
import CommandCollection from './CommandCollection';
import categoryDefinition from './root/categoryDefinition';

@singleton()
export default class CommandModule extends Module {
  tree!: CommandCategory;

  commands!: CommandCollection;

  readonly client: Client;

  constructor(client: Client) {
    super('Command');
    this.client = client;
  }

  async initialize() {
    this.tree = new CommandCategory(categoryDefinition);
    this.commands = this.tree.getAllCommands();
  }
}
