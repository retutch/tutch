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

export interface Identifier extends Syn {
    readonly type: 'Identifier';
    readonly name: string;
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
    readonly variable: Identifier;
    readonly sort: 't' | 'nat';
    readonly argument: Proposition;
}

export interface PropExists extends Syn {
    readonly type: 'PropExists';
    readonly variable: Identifier;
    readonly sort: 't' | 'nat';
    readonly argument: Proposition;
}

export function propToString(prop: Proposition): string {
    switch (prop.type) {
        case 'PropOr':
            return `(${propToString(prop.left)} | ${propToString(prop.right)})`;
        case 'PropAnd':
            return `(${propToString(prop.left)} & ${propToString(prop.right)})`;
        case 'PropImplies':
            return `(${propToString(prop.left)} => ${propToString(prop.right)})`;
        case 'PropTrue':
            return 'T';
        case 'PropFalse':
            return 'F';
        case 'PropAll':
            return `(!${prop.variable}:${prop.sort}.${propToString(prop.argument)})`;
        case 'PropExists':
            return `(?${prop.variable}:${prop.sort}.${propToString(prop.argument)})`;
        case 'Atom':
            return prop.predicate;
        default:
            return prop;
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
