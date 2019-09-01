import * as Ast from './ast';
import { impossible } from '@calculemus/impossible';

export function openTerm(term: Ast.Term, i: number, x: string): Ast.Term {
    let head: number | string;
    if (term.head === i) {
        head = x;
    } else {
        head = term.head;
    }

    return {
        type: 'Term',
        head,
        spine: term.spine.map(tm => openTerm(tm, i, x)),
    };
}

export function openProp(prop: Ast.Proposition, i: number, x: string): Ast.Proposition {
    switch (prop.type) {
        case 'Atom':
            return {
                type: 'Atom',
                predicate: prop.predicate,
                spine: prop.spine.map(tm => openTerm(tm, i, x)),
                loc: prop.loc,
                range: prop.range,
            };
        case 'PropAll':
        case 'PropExists':
            if (x === prop.variable) return prop;
            return {
                type: prop.type,
                variable: prop.variable,
                sort: prop.sort,
                argument: openProp(prop.argument, i + 1, x),
                loc: prop.loc,
                range: prop.range,
            };
        case 'PropAnd':
        case 'PropOr':
        case 'PropImplies':
            return {
                type: prop.type,
                left: openProp(prop.left, i, x),
                right: openProp(prop.right, i, x),
                loc: prop.loc,
                range: prop.range,
            };
        case 'PropFalse':
        case 'PropTrue':
            return prop;
        /* istanbul ignore next */
        default:
            return impossible(prop);
    }
}

export function openProofStep(step: Ast.ProofStep, i: number, x: string): Ast.ProofStep {
    if (step.type === 'HypotheticalProof') {
        const hypotheses = step.hypotheses.map(hypothesis => {
            if (hypothesis.type === 'VariableDeclaration') {
                i++;
                return hypothesis;
            } else {
                return openProp(hypothesis, i, x);
            }
        });

        return {
            type: 'HypotheticalProof',
            hypotheses,
            steps: step.steps.map(step => openProofStep(step, i, x)),
            consequent: openProp(step.consequent, i, x),
            loc: step.loc,
            range: step.range,
        };
    } else {
        return openProp(step, i, x);
    }
}

export function closeTerm(term: Ast.Term, i: number, x: string): Ast.Term {
    let head: number | string;
    if (term.head === x) {
        head = i;
    } else {
        head = term.head;
    }

    return {
        type: 'Term',
        head,
        spine: term.spine.map(tm => closeTerm(tm, i, x)),
    };
}

export function closeProp(prop: Ast.Proposition, i: number, x: string): Ast.Proposition {
    switch (prop.type) {
        case 'Atom':
            return {
                type: 'Atom',
                predicate: prop.predicate,
                spine: prop.spine.map(tm => closeTerm(tm, i, x)),
                loc: prop.loc,
                range: prop.range,
            };
        case 'PropAll':
        case 'PropExists':
            if (x === prop.variable) return prop;
            return {
                type: prop.type,
                variable: prop.variable,
                sort: prop.sort,
                argument: closeProp(prop.argument, i + 1, x),
                loc: prop.loc,
                range: prop.range,
            };
        case 'PropAnd':
        case 'PropOr':
        case 'PropImplies':
            return {
                type: prop.type,
                left: closeProp(prop.left, i, x),
                right: closeProp(prop.right, i, x),
                loc: prop.loc,
                range: prop.range,
            };
        case 'PropFalse':
        case 'PropTrue':
            return prop;
        /* istanbul ignore next */
        default:
            return impossible(prop);
    }
}

export function closeProofStep(step: Ast.ProofStep, i: number, x: string): Ast.ProofStep {
    if (step.type === 'HypotheticalProof') {
        const hypotheses = step.hypotheses.map(hypothesis => {
            if (hypothesis.type === 'VariableDeclaration') {
                i++;
                return hypothesis;
            } else {
                return closeProp(hypothesis, i, x);
            }
        });

        return {
            type: 'HypotheticalProof',
            hypotheses,
            steps: step.steps.map(step => closeProofStep(step, i, x)),
            consequent: closeProp(step.consequent, i, x),
            loc: step.loc,
            range: step.range,
        };
    } else {
        return closeProp(step, i, x);
    }
}
