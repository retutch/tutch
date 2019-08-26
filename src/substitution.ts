import * as Ast from './ast';
import { ParsingError } from './error';
import { impossible } from '@calculemus/impossible';

export function closeTerm(t: Ast.Term, i: number, x: string): Ast.Term {
    switch (t.type) {
        case 'Term':
            if (t.head === x) {
                throw new ParsingError(t, `The bound variable ${t.head} can't be given arguments.`);
            } else {
                return { type: 'Term', head: t.head, spine: t.spine.map(tm => closeTerm(tm, i, x)) };
            }
        case 'Const':
            if (t.name === x) {
                return { type: 'Var', index: i, range: t.range, loc: t.loc };
            } else {
                return t;
            }
        case 'Var':
            // XXX: This assumes we will _always_ be closing the outermost binder
            // (i.e. during parsing) and will NEVER need to update de bruijn indices.
            // This may need to be revisited!
            return t;
        default:
            return impossible(t);
    }
}

export function closeProp(prop: Ast.Proposition, i: number, x: string): Ast.Proposition {
    switch (prop.type) {
        case 'Atom':
            return {
                type: 'Atom',
                predicate: prop.predicate,
                spine: prop.spine.map(tm => closeTerm(tm, i, x)),
            };
        case 'PropAll':
        case 'PropExists':
            if (x === prop.variable) return prop;
            return {
                type: prop.type,
                variable: prop.variable,
                sort: prop.sort,
                argument: closeProp(prop.argument, i + 1, x),
            };
        case 'PropAnd':
        case 'PropOr':
        case 'PropImplies':
            return {
                type: prop.type,
                left: closeProp(prop.left, i, x),
                right: closeProp(prop.right, i, x),
            };
        case 'PropFalse':
        case 'PropTrue':
            return prop;
        default:
            return impossible(prop);
    }
}
