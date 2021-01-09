import {notCleaned} from '../../../utils/optionCleaners';
import {OptionsCleanerDefinition} from '../../../utils/optionsCleaner';

export interface ParseOptions<TValue = unknown> {
  default?: TValue;
}

export const parseOptionsDefinition: OptionsCleanerDefinition<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ParseOptions<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ParseOptions<any>
> = {
  default: notCleaned(),
};

export interface ParseResult<TValue = unknown> {
  value: TValue;
  length: number;
}

export type ValueFromParser<TParser extends Parser> = TParser extends Parser<infer TValue>
  ? TValue
  : never;

export type OptionsFromParser<TParser extends Parser> = TParser extends Parser<
  unknown,
  infer TOptions
>
  ? TOptions
  : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Parser<TValue = any, TOptions extends ParseOptions<TValue> = ParseOptions<TValue>> = (
  raw: string,
  options?: TOptions
) => Promise<ParseResult<TValue> | undefined>;

export function generateDefaultOrNothing<TValue>(
  options: ParseOptions<TValue>
): ParseResult<TValue> | undefined {
  if (options.default === undefined) return undefined;
  return {
    value: options.default,
    length: 0,
  };
}
