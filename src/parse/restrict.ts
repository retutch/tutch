import * as ast from '../ast';
import * as parse from './parse';

let range = true;
let loc = true;

export function Identifier(syn: parse.Identifier): ast.Identifier {
    return {
        type: 'Identifier',
        name: syn.name,
        range: range ? syn.range : undefined,
        loc: loc ? syn.loc : undefined,
    };
}

export function PropTrue(syn: ast.PropTrue): ast.PropTrue {
    return {
        type: 'PropTrue',
        range: range ? syn.range : undefined,
        loc: loc ? syn.loc : undefined,
    };
}

export function PropFalse(syn: ast.PropFalse): ast.PropFalse {
    return {
        type: 'PropFalse',
        range: range ? syn.range : undefined,
        loc: loc ? syn.loc : undefined,
    };
}

export function Atom(syn: parse.Identifier): ast.Atom {
    if (!syn.name.match(/^[A-Z]/))
        throw new Error('Atomic propositions must start with an upper case letter');

    return {
        type: 'Atom',
        predicate: syn.name,
        range: range ? syn.range : undefined,
        loc: loc ? syn.loc : undefined,
    };
}

export function PropAnd(syn: parse.BinaryProposition): ast.PropAnd {
    return {
        type: 'PropAnd',
        left: Proposition(syn.left),
        right: Proposition(syn.right),
        range: range ? syn.range : undefined,
        loc: loc ? syn.loc : undefined,
    };
}

export function PropImplies(syn: parse.BinaryProposition): ast.PropImplies {
    return {
        type: 'PropImplies',
        left: Proposition(syn.left),
        right: Proposition(syn.right),
        range: range ? syn.range : undefined,
        loc: loc ? syn.loc : undefined,
    };
}

export function Proposition(syn: parse.Proposition): ast.Proposition {
    switch (syn.type) {
        case 'Identifier':
            return Atom(syn);
        case 'PropTrue':
            return PropTrue(syn);
        case 'PropFalse':
            return PropFalse(syn);
        case 'BinaryProposition': {
            switch (syn.oper) {
                case '&':
                    return PropAnd(syn);
                case '=>':
                    return PropImplies(syn);
                default:
                    throw new Error('unimpl');
            }
        }
        default:
            throw new Error('unimpl');
    }
}

export function ProofStep(syn: parse.ProofStep): ast.ProofStep {
    switch (syn.type) {
        case 'HypotheticalProof':
            return {
                type: 'HypotheticalProof',
                hypotheses: syn.hypotheses.map(Proposition),
                steps: syn.steps.map(ProofStep),
                range: range ? syn.range : undefined,
                loc: loc ? syn.loc : undefined,
            };
        default:
            return Proposition(syn);
    }
}

export function Proof(syn: parse.ProofDeclaration): ast.Proof {
    return {
        type: 'Proof',
        name: syn.name,
        goal: Proposition(syn.goal),
        proof: syn.steps.map(x => ProofStep(x)),
        range: range ? syn.range : undefined,
        loc: loc ? syn.loc : undefined,
    };
}
