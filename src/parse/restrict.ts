import * as ast from '../ast';
import * as parse from './parse';
import { impossible } from '@calculemus/impossible';
import { ParsingError } from '../error';
import { closeProp } from '../substitution';

let range = true;
let loc = true;

export function TermAtom(syn: parse.TermAtom): ast.Term {
    if (!syn.head.match(/^[a-z]/))
        throw new ParsingError(syn, 'Term variables and constants must start with a lower case letter');

    return {
        type: 'Term',
        head: syn.head,
        spine: syn.spine.map(Term),
        range: range ? syn.range : undefined,
        loc: loc ? syn.loc : undefined,    
    }
}

export function Term(syn: parse.Term): ast.Term {
    switch (syn.type) {
        case 'Atom':
            return TermAtom(syn);
        case 'Parens':
            return Term(syn.argument);
    }
}

export function PropTrue(syn: ast.PropTrue): ast.PropTrue {
    return {
        type: 'PropTrue',
        range: range ? syn.range : undefined,
        loc: loc ? syn.loc : undefined,
    };
}

export function PropFalse(syn: parse.Proposition): ast.PropFalse {
    return {
        type: 'PropFalse',
        range: range ? syn.range : undefined,
        loc: loc ? syn.loc : undefined,
    };
}

export function PropAtom(syn: parse.PropAtom): ast.Atom {
    if (!syn.head.match(/^[A-Z]/))
        throw new ParsingError(syn, 'Predicate names must start with an upper case letter');

    return {
        type: 'Atom',
        predicate: syn.head,
        spine: syn.spine.map(Term),
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

export function PropImplies(syn: parse.BinaryProposition, swap?: true): ast.PropImplies {
    return {
        type: 'PropImplies',
        left: Proposition(swap ? syn.right : syn.left),
        right: Proposition(swap ? syn.left : syn.right),
        range: range ? syn.range : undefined,
        loc: loc ? syn.loc : undefined,
    };
}

export function PropEquiv(syn: parse.BinaryProposition): ast.PropAnd {
    return {
        type: 'PropAnd',
        left: PropImplies(syn),
        right: PropImplies(syn, true),
        range: range ? syn.range : undefined,
        loc: loc ? syn.loc : undefined,
    };
}

export function PropOr(syn: parse.BinaryProposition): ast.PropOr {
    return {
        type: 'PropOr',
        left: Proposition(syn.left),
        right: Proposition(syn.right),
        range: range ? syn.range : undefined,
        loc: loc ? syn.loc : undefined,
    };
}

export function PropNot(syn: parse.UnaryProposition): ast.PropImplies {
    return {
        type: 'PropImplies',
        left: Proposition(syn.argument),
        right: PropFalse(syn),
        range: range ? syn.range : undefined,
        loc: loc ? syn.loc : undefined,
    };
}

export function Sort(loc: ast.SourceLocation, id: string): 'nat' | 't' {
    switch (id) {
        // case 'nat':
        case 't':
            return id;
        default:
            throw new ParsingError(loc, `Only \`t\` is allowed as a first-order type, not ${id}`);
    }
}

export function PropAll(syn: parse.QuantifiedProposition): ast.PropAll {
    if (!syn.variable.match(/^[a-z]/))
        throw new ParsingError(syn, 'Term variables must start with a lower case letter');

    return {
        type: 'PropAll',
        variable: syn.variable,
        sort: Sort(syn.loc, syn.sort),
        argument: closeProp(Proposition(syn.argument), 0, syn.variable),
        range: range ? syn.range : undefined,
        loc: loc ? syn.loc : undefined,
    };
}

export function PropExists(syn: parse.QuantifiedProposition): ast.PropExists {
    if (!syn.variable.match(/^[a-z]/))
        throw new ParsingError(syn, 'Term variables must start with a lower case letter');

    return {
        type: 'PropExists',
        variable: syn.variable,
        sort: Sort(syn.loc, syn.sort),
        argument: closeProp(Proposition(syn.argument), 0, syn.variable),
        range: range ? syn.range : undefined,
        loc: loc ? syn.loc : undefined,
    };
}

export function Proposition(syn: parse.Proposition): ast.Proposition {
    switch (syn.type) {
        case 'Parens':
            return Proposition(syn.argument);
        case 'PropAtom':
            return PropAtom(syn);
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
                case '<=>':
                    return PropEquiv(syn);
                case '|':
                    return PropOr(syn);
                /* istanbul ignore next */
                default:
                    return impossible(syn.oper);
            }
        }
        case 'UnaryProposition': {
            return PropNot(syn);
        }
        case 'QuantifiedProposition': {
            switch (syn.oper) {
                case '!':
                    return PropAll(syn);
                case '?':
                    return PropExists(syn);
                /* istanbul ignore next */
                default:
                    return impossible(syn.oper);
            }
        }
        /* istanbul ignore next */
        default:
            return impossible(syn);
    }
}

export function ProofStep(syn: parse.ProofStep): ast.ProofStep {
    switch (syn.type) {
        case 'HypotheticalProof':
            const steps = syn.steps.map(ProofStep);
            if (steps.length === 0) throw new ParsingError(syn, 'Hypothetical proof has zero steps');
            const consequent = steps.pop()!;
            if (consequent.type === 'HypotheticalProof')
                throw new ParsingError(
                    consequent,
                    'Hypothetical proof [...] must end with a proposition, not another hypothetical sequence.'
                );
            return {
                type: 'HypotheticalProof',
                hypotheses: syn.hypotheses.map(Proposition),
                steps,
                consequent,
                range: range ? syn.range : undefined,
                loc: loc ? syn.loc : undefined,
            };
        default:
            return Proposition(syn);
    }
}

export function Proof(syn: parse.ProofDeclaration): ast.Proof {
    const goal = Proposition(syn.goal);
    const proof = syn.steps.map(x => ProofStep(x));
    const consequent = proof.pop()!;
    if (consequent.type === 'HypotheticalProof' || !ast.equalProps(goal, consequent)) {
        throw new ParsingError(consequent, "The last line in a proof must be the proof's goal proposition.");
    }
    return {
        type: 'Proof',
        name: syn.name,
        goal,
        proof,
        range: range ? syn.range : undefined,
        loc: loc ? syn.loc : undefined,
        consequent,
    };
}
