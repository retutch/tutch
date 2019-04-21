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
    readonly source?: string | null;
}

export interface Identifier extends Syn {
    readonly type: 'Identifier';
    readonly name: string;
}

export type Proposition = PropTrue | PropFalse | Atom | PropAnd | PropImplies;

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

export type ProofStep = Proposition | HypotheticalProof;

export interface HypotheticalProof extends Syn {
    readonly type: 'HypotheticalProof';
    hypotheses: Proposition[];
    steps: ProofStep[];
}

export interface Proof extends Syn {
    readonly type: 'Proof';
    readonly name: string;
    readonly goal: Proposition;
    readonly proof: ProofStep[];
}
