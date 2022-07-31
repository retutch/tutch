import { Token } from 'moo';
import * as ast from '../ast';

function tokloc(tok: Token) {
  return {
    start: { line: tok.line, column: tok.col },
    end: tok.lineBreaks
      ? { line: tok.line + 1, column: 1 }
      : { line: tok.line, column: tok.col + tok.text.length },
    source: null,
  };
}

function locloc(left: ast.SourceLocation, right: ast.SourceLocation): ast.SourceLocation {
  return {
    start: left.start,
    end: right.end,
    source: null,
  };
}

export interface Syn {
  readonly type: string;
  readonly range: [number, number];
  readonly loc: ast.SourceLocation;
}

type WS = string;
function WS(): WS {
  return '';
}

export interface TermParens extends Syn {
  type: 'Parens';
  argument: Term;
  range: [number, number];
  loc: ast.SourceLocation;
}

export interface TermAtom extends Syn {
  type: 'Atom';
  head: string;
  spine: Term[];
  range: [number, number];
  loc: ast.SourceLocation;
}

export type Term = TermParens | TermAtom;

export function TermParens([l, , argument, , r]: [Token, WS, Term, WS, Token]): TermParens & Syn {
  return {
    type: 'Parens',
    argument,
    range: [l.offset, r.offset + r.text.length],
    loc: locloc(tokloc(l), tokloc(r)),
  };
}

export function TermConst([tok]: [Token]): TermAtom & Syn {
  return {
    type: 'Atom',
    head: tok.text,
    spine: [],
    range: [tok.offset, tok.offset.toExponential.length],
    loc: tokloc(tok),
  };
}

export function TermAtom([l, , head, args, , r]: [
  Token,
  WS,
  Token,
  [WS, Term][],
  WS,
  Token,
]): TermAtom & Syn {
  const spine = args.map(([, term]) => term);

  return {
    type: 'Atom',
    head: head.text,
    spine,
    range: [l.offset, r.offset + r.text.length],
    loc: locloc(tokloc(l), tokloc(r)),
  };
}

export interface PropParens extends Syn {
  type: 'Parens';
  argument: Proposition;
  range: [number, number];
  loc: ast.SourceLocation;
}

export function PropParens([l, , argument, , r]: [Token, WS, Proposition, WS, Token]): PropParens &
  Syn {
  return {
    type: 'Parens',
    argument,
    range: [l.offset, r.offset + r.text.length],
    loc: locloc(tokloc(l), tokloc(r)),
  };
}

export interface PropAtom extends Syn {
  type: 'PropAtom';
  head: string;
  spine: Term[];
  range: [number, number];
  loc: ast.SourceLocation;
}

export function PropAtom([head, args]: [Token, [WS, Term][]]): PropAtom & Syn {
  const spine = args.map(([, term]) => term);
  let rightRange;
  let rightLoc;

  if (spine.length > 0) {
    rightRange = spine[spine.length - 1].range[1];
    rightLoc = spine[spine.length - 1].loc;
  } else {
    rightRange = head.offset + head.text.length;
    rightLoc = tokloc(head);
  }

  return {
    type: 'PropAtom',
    head: head.text,
    spine,
    range: [head.offset, rightRange],
    loc: locloc(tokloc(head), rightLoc),
  };
}

export type Proposition =
  | (ast.PropTrue & Syn)
  | (ast.PropFalse & Syn)
  | PropParens
  | PropAtom
  | UnaryProposition
  | BinaryProposition
  | QuantifiedProposition;

export function PropTrue([tok]: [Token]): ast.PropTrue & Syn {
  return {
    type: 'PropTrue',
    range: [tok.offset, tok.offset + tok.text.length],
    loc: tokloc(tok),
  };
}

export function PropFalse([tok]: [Token]): ast.PropFalse & Syn {
  return {
    type: 'PropFalse',
    range: [tok.offset, tok.offset + tok.text.length],
    loc: tokloc(tok),
  };
}

export interface UnaryProposition extends Syn {
  type: 'UnaryProposition';
  argument: Proposition;
}

export function UnaryProposition([neg, , argument]: [Token, WS, Proposition]): UnaryProposition {
  return {
    type: 'UnaryProposition',
    argument,
    range: [neg.offset, argument.range[1]],
    loc: locloc(tokloc(neg), argument.loc),
  };
}

export interface BinaryProposition extends Syn {
  type: 'BinaryProposition';
  left: Proposition;
  oper: '&' | '=>' | '<=>' | '|';
  right: Proposition;
}

type BinaryPropositionArg = [Proposition, WS, string, WS, Proposition];
export function BinaryProposition([
  left,
  ,
  oper,
  ,
  right,
]: BinaryPropositionArg): BinaryProposition {
  switch (oper) {
    case '&':
    case '|':
    case '<=>':
    case '=>':
      break;
    default:
      throw new Error(`Unidentified binary proposition %{oper}. (This error should be impossible, there is a bug!)`);
  }
  return {
    type: 'BinaryProposition',
    left,
    oper: oper,
    right,
    range: [left.range[0], right.range[1]],
    loc: locloc(left.loc, right.loc),
  };
}

export interface QuantifiedProposition extends Syn {
  type: 'QuantifiedProposition';
  oper: '!' | '?';
  variable: string;
  sort: string | null;
  argument: Proposition;
}

type QuantifiedPropositionArg = [
  Token, // ! or ?
  WS,
  Token, // variable name
  WS,
  [Token, WS, Token, WS] | null, // : t
  Token, // .
  WS,
  Proposition,
];
export function QuantifiedProposition([
  oper,
  ,
  x,
  ,
  ty,
  ,
  ,
  argument,
]: QuantifiedPropositionArg): QuantifiedProposition {
  const sort: string | null = ty ? ty[2].text : null;
  switch (oper.text) {
    case '!':
    case '?':
      break;
    default:
      throw new Error(`Unidentified quantifier %{oper}. (This error should be impossible, there is a bug!)`);
  }
  return {
    type: 'QuantifiedProposition',
    oper: oper.text,
    variable: x.text,
    sort,
    argument,
    range: [oper.offset, argument.range[1]],
    loc: locloc(tokloc(oper), argument.loc),
  };
}

export type ProofStep = Proposition | HypotheticalProof;

export interface HypotheticalProof extends Syn {
  type: 'HypotheticalProof';
  hypotheses: Hypothesis[];
  steps: ProofStep[];
}

export type Hypothesis = Proposition | VariableDeclaration;

export interface VariableDeclaration extends Syn {
  type: 'VariableDeclaration';
  variable: string;
  sort: string | null;
}

export function LetHyp([l, , x, s]: [
  Token,
  WS,
  Token,
  null | [WS, Token, WS, Token],
]): VariableDeclaration {
  const rightRange = s ? s[3].offset + s[3].text.length : x.offset + x.text.length;
  const rightLoc = s ? tokloc(s[3]) : tokloc(x);

  return {
    type: 'VariableDeclaration',
    variable: x.text,
    sort: s ? s[3].text : null,
    range: [l.offset, rightRange],
    loc: locloc(tokloc(l), rightLoc),
  };
}

export function TypeHyp([x, , , , t]: [Token, WS, Token, WS, Token]): VariableDeclaration {
  return {
    type: 'VariableDeclaration',
    variable: x.text,
    sort: t.text,
    range: [x.offset, t.offset + t.text.length],
    loc: locloc(tokloc(x), tokloc(t)),
  };
}

type HypotheticalProofArg = [Token, WS, Hypothesis[], WS, [Token, WS, ProofStep, WS][], Token];
export function HypotheticalProof([
  l,
  ,
  hypotheses,
  ,
  steps,
  r,
]: HypotheticalProofArg): HypotheticalProof {
  return {
    type: 'HypotheticalProof',
    hypotheses,
    steps: steps.map((x) => x[2]),
    range: [l.offset, r.offset + r.text.length],
    loc: locloc(tokloc(l), tokloc(r)),
  };
}

type HypothesesArg = [[Proposition, WS, Token, WS][], Proposition];
export function Hypotheses([steps, last]: HypothesesArg): Proposition[] {
  return steps.map((x) => x[0]).concat([last]);
}

type ProofSequenceArg = [[ProofStep, WS, Token, WS][], ProofStep];
export function ProofSequence([steps, last]: ProofSequenceArg): ProofStep[] {
  return steps.map((x) => x[0]).concat([last]);
}

export interface ProofDeclaration extends Syn {
  type: 'ProofDeclaration';
  name: string;
  goal: Proposition;
  steps: ProofStep[];
}

type ProofDeclarationArg = [
  Token,
  WS,
  Token,
  WS,
  Token,
  WS,
  Proposition,
  WS,
  Token,
  WS,
  Token,
  WS,
  ProofStep[],
  WS,
  Token,
];
export function ProofDeclaration([
  proof,
  ,
  id,
  ,
  ,
  ,
  goal,
  ,
  ,
  ,
  ,
  ,
  steps,
  ,
  end,
]: ProofDeclarationArg): ProofDeclaration {
  return {
    type: 'ProofDeclaration',
    name: id.text,
    goal,
    steps,
    range: [proof.offset, end.offset + end.text.length],
    loc: locloc(tokloc(proof), tokloc(end)),
  };
}
