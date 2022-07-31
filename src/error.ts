import { SourceLocation, Syn } from './ast';

export class ParsingError extends Error {
  public readonly name: 'ParsingError' = 'ParsingError';
  loc: null | SourceLocation;
  constructor(syn: SourceLocation | { loc?: SourceLocation }, msg: string) {
    super(msg);
    const loc = 'start' in syn ? syn : syn.loc ? syn.loc : null;
    this.loc = loc;
  }
}

export class NoJustificationError extends Error {
  public readonly name: 'NoJustification' = 'NoJustification';
  loc: SourceLocation | undefined;
  constructor(msg: string, elem?: Syn | SourceLocation) {
    super(msg);
    if (!elem) return;
    if ('type' in elem) this.loc = elem.loc;
    else this.loc = elem;
  }
}
