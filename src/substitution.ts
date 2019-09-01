import * as Ast from './ast';
import { impossible } from '@calculemus/impossible';
import { ParsingError } from './error';

export function openTerm(term: Ast.Term, index: number, x: string): Ast.Term {
    switch (term.type) {
        case 'TermVar': {
            if (term.index === index) {
                return {
                    type: 'TermConst',
                    head: x,
                    spine: [],
                };
            } else {
                return term;
            }
        }
        case 'TermConst': {
            return {
                type: 'TermConst',
                head: term.head,
                spine: term.spine.map(term => openTerm(term, index, x)),
            };
        }
        default: {
            throw impossible(term);
        }
    }
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

export function closeTerm(term: Ast.Term, index: number, x: string): Ast.Term {
    switch (term.type) {
        case 'TermVar': {
            return term;
        }
        case 'TermConst': {
            if (term.head === x) {
                if (term.spine.length > 0) {
                    throw new ParsingError(
                        term,
                        `Bound variable '${term.head}' cannot have arguments applied to it.`
                    );
                } else {
                    return {
                        type: 'TermVar',
                        index,
                    };
                }
            } else {
                return {
                    type: 'TermConst',
                    head: term.head,
                    spine: term.spine.map(term => closeTerm(term, index, x)),
                };
            }
        }
        /* istanbul ignore next */
        default: {
            throw impossible(term);
        }
    }
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

export interface Cell {
    contents: null | Ast.Term;
}

export function matchTerm(closedTerm: Ast.Term, openTerm: Ast.Term, cell: Cell, index: number): boolean {
    switch (openTerm.type) {
        case 'TermVar':
            if (openTerm.index === index) {
                if (cell.contents === null) {
                    // XXX - occurs check - need to check closedTerm is closed
                    cell.contents = closedTerm;
                    return true;
                } else {
                    return Ast.equalTerms(closedTerm, cell.contents);
                }
            } else {
                // Closed and open are the same bound variable
                return closedTerm.type === openTerm.type && closedTerm.index === openTerm.index;
            }
        case 'TermConst':
            return (
                // Closed term and open term are both constants,
                closedTerm.type === openTerm.type &&
                closedTerm.head === openTerm.head && // With the same head,
                closedTerm.spine.length === openTerm.spine.length && // And the same arguments
                closedTerm.spine.every((tm, i) => matchTerm(tm, openTerm.spine[i], cell, index))
            );
        default:
            throw impossible(openTerm);
    }
}

export function matchProp(
    closed: Ast.Proposition,
    open: Ast.Proposition,
    cell: Cell,
    index: number
): boolean {
    switch (open.type) {
        case 'Atom':
            if (closed.type !== open.type) return false;
            if (closed.predicate !== open.predicate) return false;
            if (closed.spine.length !== open.spine.length) return false;
            return closed.spine.every((tm, i) => matchTerm(tm, open.spine[i], cell, index));
        case 'PropAll':
        case 'PropExists':
            if (closed.type !== open.type) return false;
            return matchProp(closed.argument, open.argument, cell, index + 1);
        case 'PropAnd':
        case 'PropOr':
        case 'PropImplies':
            if (closed.type !== open.type) return false;
            return (
                matchProp(closed.left, open.left, cell, index) &&
                matchProp(closed.right, open.right, cell, index)
            );
        case 'PropTrue':
        case 'PropFalse':
            return closed.type === open.type;
        default:
            throw impossible(open);
    }
}
