import { Token } from 'moo';
import * as ast from '../ast';
import { ImpossibleError } from '../error';

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

export interface PropParens extends Syn {
    type: 'Parens';
    argument: Proposition;
    range: [number, number];
    loc: ast.SourceLocation;
}

export function PropParens([l, , argument, , r]: [Token, WS, Proposition, WS, Token]): PropParens {
    return {
        type: 'Parens',
        argument,
        range: [l.offset, r.offset + r.text.length],
        loc: locloc(tokloc(l), tokloc(r)),
    };
}

export interface Identifier extends Syn {
    type: 'Identifier';
    name: string;
    range: [number, number];
    loc: ast.SourceLocation;
}

export function Identifier([tok]: [Token]): ast.Identifier & Syn {
    return {
        type: 'Identifier',
        name: tok.text,
        range: [tok.offset, tok.offset + tok.text.length],
        loc: tokloc(tok),
    };
}

export type Proposition =
    | ast.PropTrue & Syn
    | ast.PropFalse & Syn
    | PropParens
    | Identifier
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
export function BinaryProposition([left, , oper, , right]: BinaryPropositionArg): BinaryProposition {
    switch (oper) {
        case '&':
        case '|':
        case '<=>':
        case '=>':
            break;
        default:
            throw new ImpossibleError(`Unidentified binary proposition %{oper}`);
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
    variable: Identifier;
    sort: Identifier;
    argument: Proposition;
}

type QuantifiedPropositionArg = [
    Token,
    WS,
    Identifier,
    WS,
    Token,
    WS,
    Identifier,
    WS,
    Token,
    WS,
    Proposition
];
export function QuantifiedProposition([
    oper,
    ,
    x,
    ,
    ,
    ,
    ty,
    ,
    ,
    ,
    argument,
]: QuantifiedPropositionArg): QuantifiedProposition {
    switch (oper.text) {
        case '!':
        case '?':
            break;
        default:
            throw new ImpossibleError(`Unidentified quantifier %{oper}`);
    }
    return {
        type: 'QuantifiedProposition',
        oper: oper.text,
        variable: x,
        sort: ty,
        argument,
        range: [oper.offset, argument.range[1]],
        loc: locloc(tokloc(oper), argument.loc),
    };
}

export type ProofStep = Proposition | HypotheticalProof;

export interface HypotheticalProof extends Syn {
    type: 'HypotheticalProof';
    hypotheses: Proposition[];
    steps: ProofStep[];
}

type HypotheticalProofArg = [Token, WS, Proposition[], WS, [Token, WS, ProofStep, WS][], Token];
export function HypotheticalProof([l, , hypotheses, , steps, r]: HypotheticalProofArg) {
    return {
        type: 'HypotheticalProof',
        hypotheses,
        steps: steps.map(x => x[2]),
        range: [l.offset, r.offset + r.text.length],
        loc: locloc(tokloc(l), tokloc(r)),
    };
}

type HypothesesArg = [[Proposition, WS, Token, WS][], Proposition];
export function Hypotheses([steps, last]: HypothesesArg): Proposition[] {
    return steps.map(x => x[0]).concat([last]);
}

type ProofSequenceArg = [[ProofStep, WS, Token, WS][], ProofStep];
export function ProofSequence([steps, last]: ProofSequenceArg): ProofStep[] {
    return steps.map(x => x[0]).concat([last]);
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
    Token
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
