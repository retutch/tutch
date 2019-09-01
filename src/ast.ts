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

export type Term = TermVar | TermConst;

export interface TermVar extends Syn {
    readonly type: 'TermVar',
    readonly index: number;
}

export interface TermConst extends Syn {
    readonly type: 'TermConst';
    readonly head: string;
    readonly spine: Term[];
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

export function termToString(sigma: string[], term: Term): string {
    switch (term.type) {
        case 'TermConst': {
            if (term.spine.length === 0) {
                return term.head;
            } else {
                return `(${term.head}${term.spine.map(tm => ` ${termToString(sigma, tm)}`)})`;
            }
        }
        case 'TermVar': {
            return sigma[term.index];
        }
        default: {
            throw impossible(term);
        }
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
            throw impossible(prop);
    }
}

export function termToStringDebug(term: Term): string {
    switch (term.type) {
        case 'TermVar': {
            return `#${term.index}`;
        }
        case 'TermConst': {
            if (term.spine.length === 0) {
                return term.head;
            } else {
                return `(${term.head}${term.spine.map(tm => ` ${termToStringDebug(tm)}`).join('')})`;
            }
        }
        default: {
            throw impossible(term);
        }
    }
}

export function propToStringDebug(prop: Proposition): string {
    switch (prop.type) {
        case 'PropOr':
            return `(${propToStringDebug(prop.left)} | ${propToStringDebug(prop.right)})`;
        case 'PropAnd':
            return `(${propToStringDebug(prop.left)} & ${propToStringDebug(prop.right)})`;
        case 'PropImplies':
            return `(${propToStringDebug(prop.left)} => ${propToStringDebug(prop.right)})`;
        case 'PropTrue':
            return 'T';
        case 'PropFalse':
            return 'F';
        case 'PropAll': {
            return `(!${prop.variable}:${prop.sort}.${propToStringDebug(prop.argument)})`;
        }
        case 'PropExists': {
            return `(?${prop.variable}:${prop.sort}.${propToStringDebug(prop.argument)})`;
        }
        case 'Atom':
            return `${prop.predicate}${prop.spine.map(tm => ` ${termToStringDebug(tm)}`).join('')}`;
        /* istanbul ignore next */
        default:
            throw impossible(prop);
    }
}

export type ProofStep = Proposition | HypotheticalProof;

export interface VariableDeclaration extends Syn {
    readonly type: 'VariableDeclaration';
    readonly variable: string;
    readonly sort: string;
}

export type Hypothesis = Proposition | VariableDeclaration;

export interface HypotheticalProof extends Syn {
    readonly type: 'HypotheticalProof';
    hypotheses: Hypothesis[];
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
        case 'TermVar': {
            return a.type === b.type &&
                a.index === b.index;
        }
        case 'TermConst': {
            return a.type === b.type &&
                a.head === b.head &&
                a.spine.length === b.spine.length && 
                a.spine.every((tm, i) => equalTerms(tm, b.spine[i]));
        }
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

/*
export interface Cell { match: null | Term }

export function matchTerm(closed: Term, open: Term, cell: Cell): boolean {
    if (open.head === 0) {
        if (cell.match === null) {
            cell.match = closed;
            return true;
        } else {
            return equalTerms(closed, cell.match);
        }
    } else if (typeof closed.head === 'number' && typeof open.head === 'number') {
        return closed.head === open.head + 1;
    } else if (typeof closed.head === 'string' && typeof open.head === 'string') {
        if (closed.head !== open.head || closed.spine.length !== open.spine.length) {
            return false;
        } else {
            const matches = 
        }
    }
    if (typeof closed.head === 'number' && typeof closed.open === 'number') {

    }
}

export function matchProps(closed: Proposition, open: Proposition): boolean | Term {

}
*/
