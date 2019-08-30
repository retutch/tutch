import * as Ast from './ast';
import { impossible } from '@calculemus/impossible';

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
        /* istanbul ignore next */
        default:
            return impossible(prop);
    }
}
