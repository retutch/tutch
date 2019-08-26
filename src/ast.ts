import { impossible } from '@calculemus/impossible';

export interface Syn {
    readonly type: string;
    readonly range?: [number, number];
    readonly loc?: SourceLocation;
}

export interface Position {
    readonly line: number;
    readonly column: number;
}

export interface SourceLocation {
    readonly start: Position;
    readonly end: Position;
    readonly source: string | null;
}

export type Term = TermAtom | TermVar | TermConst;

export interface TermVar extends Syn {
    readonly type: 'Var';
    readonly index: number;
}

export interface TermConst extends Syn {
    readonly type: 'Const';
    readonly name: string;
}

export interface TermAtom extends Syn {
    readonly type: 'Term';
    readonly head: string;
    readonly spine: Term[]; // Length > 0
}

export type Proposition = PropTrue | PropFalse | Atom | PropAnd | PropImplies | PropOr | PropAll | PropExists;

export interface PropTrue extends Syn {
    readonly type: 'PropTrue';
}

export interface PropFalse extends Syn {
    readonly type: 'PropFalse';
}

export interface Atom extends Syn {
    readonly type: 'Atom';
    readonly predicate: string;
    readonly spine: Term[];
}

export interface PropAnd extends Syn {
    readonly type: 'PropAnd';
    readonly left: Proposition;
    readonly right: Proposition;
}

export interface PropImplies extends Syn {
    readonly type: 'PropImplies';
    readonly left: Proposition;
    readonly right: Proposition;
}

export interface PropOr extends Syn {
    readonly type: 'PropOr';
    readonly left: Proposition;
    readonly right: Proposition;
}

export interface PropAll extends Syn {
    readonly type: 'PropAll';
    readonly variable: string;
    readonly sort: 't' | 'nat';
    readonly argument: Proposition;
}

export interface PropExists extends Syn {
    readonly type: 'PropExists';
    readonly variable: string;
    readonly sort: 't' | 'nat';
    readonly argument: Proposition;
}

function freshenRelativeTo(sigma: string[], x: string): string {
    let i = 0;
    let z = x;
    while (sigma.some(y => x === y)) {
        i += 1;
        z = `${x}${i}`;
    }

    return z;
}

export function termToString(sigma: string[], tm: Term): string {
    switch (tm.type) {
        case 'Const':
            return tm.name;
        case 'Term':
            return `(${tm.head}${tm.spine.map(tm => ` ${termToString(sigma, tm)}`).join('')})`;
        case 'Var':
            return sigma[tm.index];
    }
}

export function propToString(sigma: string[], prop: Proposition): string {
    switch (prop.type) {
        case 'PropOr':
            return `(${propToString(sigma, prop.left)} | ${propToString(sigma, prop.right)})`;
        case 'PropAnd':
            return `(${propToString(sigma, prop.left)} & ${propToString(sigma, prop.right)})`;
        case 'PropImplies':
            return `(${propToString(sigma, prop.left)} => ${propToString(sigma, prop.right)})`;
        case 'PropTrue':
            return 'T';
        case 'PropFalse':
            return 'F';
        case 'PropAll': {
            const x = freshenRelativeTo(sigma, prop.variable);
            return `(!${x}:${prop.sort}.${propToString([x].concat(sigma), prop.argument)})`;
        }
        case 'PropExists': {
            const x = freshenRelativeTo(sigma, prop.variable);
            return `(?${x}:${prop.sort}.${propToString([x].concat(sigma), prop.argument)})`;
        }
        case 'Atom':
            return `${prop.predicate}${prop.spine.map(tm => ` ${termToString(sigma, tm)}`).join('')}`;
        /* istanbul ignore next */
        default:
            return impossible(prop);
    }
}

export type ProofStep = Proposition | HypotheticalProof;

export interface HypotheticalProof extends Syn {
    readonly type: 'HypotheticalProof';
    hypotheses: Proposition[];
    steps: ProofStep[];
    consequent: Proposition;
}

export interface Proof extends Syn {
    readonly type: 'Proof';
    readonly name: string;
    readonly goal: Proposition;
    readonly proof: ProofStep[];
}
