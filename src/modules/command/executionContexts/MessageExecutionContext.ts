import {Message} from 'discord.js';
import GuildWrapper from '../../../database/wrappers/GuildWrapper';
import {OptionsFromParser, Parser, ParseResult, ValueFromParser} from '../parsers/parser';
import UserExecutionContext from './UserExecutionContext';

export type ParsedValues = Record<string, unknown>;

export type ParseResults<TValues extends ParsedValues = ParsedValues> = {
  [name in keyof TValues]: ParseResult<TValues[name]>;
};

export default abstract class MessageExecutionContext extends UserExecutionContext {
  message: Message;

  readonly values: ParsedValues = {};

  readonly parseResults: ParseResults = {};

  private _parseIndex = 0;

  get parseIndex(): number {
    return this._parseIndex;
  }

  get remainingContent(): string {
    return this.message.content.slice(this.parseIndex);
  }

  constructor(message: Message, guild: GuildWrapper | undefined) {
    super(message.author, guild);
    this.message = message;
  }

  async parseNext<TParser extends Parser>(
    name: string,
    parser: TParser,
    options?: OptionsFromParser<TParser>
  ): Promise<ValueFromParser<TParser>> {
    const result = await parser(this.remainingContent, options);
    if (!result) throw new Error(`Failed to parse value called "${name}".`);
    this.addParseResult(name, result);
    return result.value;
  }

  async parseOptionalNext<TParser extends Parser>(
    name: string,
    parser: TParser,
    options?: OptionsFromParser<TParser>
  ): Promise<ValueFromParser<TParser> | undefined> {
    const result = (await parser(this.remainingContent, options)) ?? {value: undefined, length: 0};
    this.addParseResult(name, result);
    return result.value;
  }

  protected addParseResult(name: string, result: ParseResult): void {
    this.values[name] = result.value;
    this.parseResults[name] = result;
    this._parseIndex += result.length;
  }
}
