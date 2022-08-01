import { SourceLocation } from './ast';

export class ParsingError extends Error {
  public readonly name: 'ParsingError' = 'ParsingError';
  loc: null | SourceLocation;
  constructor(syn: SourceLocation | { loc?: SourceLocation }, msg: string) {
    super(msg);
    const loc = 'start' in syn ? syn : syn.loc ? syn.loc : null;
    this.loc = loc;
  }
}
