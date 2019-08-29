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
    readonly consequent: Proposition; // Must be same as goal
}

export function equalTerms(a: Term, b: Term): boolean {
    switch (a.type) {
        case 'Var':
            return a.type == b.type && a.index === b.index;
        case 'Term':
            return (
                a.type === b.type &&
                a.head === b.head &&
                a.spine.length === b.spine.length &&
                a.spine.every((tm, i) => equalTerms(tm, b.spine[i]))
            );
        case 'Const':
            return a.type === b.type && a.name === b.name;
    }
}

export function equalProps(a: Proposition, b: Proposition): boolean {
    switch (a.type) {
        case 'Atom':
            return (
                a.type === b.type &&
                a.predicate === b.predicate &&
                a.spine.length === b.spine.length &&
                a.spine.every((tm, i) => equalTerms(tm, b.spine[i]))
            );
        case 'PropTrue':
        case 'PropFalse':
            return a.type === b.type;
        case 'PropAnd':
        case 'PropImplies':
        case 'PropOr':
            return a.type === b.type && equalProps(a.left, b.left) && equalProps(a.right, b.right);
        case 'PropAll':
            return a.type === b.type && a.sort === b.sort && equalProps(a.argument, b.argument);
        case 'PropExists':
            return a.type === b.type && a.sort === b.sort && equalProps(a.argument, b.argument);
        /* istanbul ignore next */
        default:
            return impossible(a);
    }
}
