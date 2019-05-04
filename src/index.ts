import * as Ast from './ast';
import { Parser, Grammar } from 'nearley';
import { checkProof, NoJustification, Justification } from './check';
import { Proof } from './parse/restrict';
const rules = require('../dist/rules');
export { NoJustification, Justification } from './check';
export * from './ast';

export function parse(str: string): Ast.Proof[] {
    const parser = new Parser(Grammar.fromCompiled(rules));
    parser.feed(str);
    const syn = parser.finish();
    const ast = syn[0].map(Proof);
    return ast;
}

export function evaluate(proofs: Ast.Proof[]): Justification[] {
    return proofs.reduce((justs: Justification[], proof) => justs.concat(checkProof(proof)), []);
}

export function evaluateAssert(proofs: Ast.Proof[]) {
    evaluate(proofs).forEach(just => {
        if (just.type === 'NotJustified') throw new NoJustification('', just);
    });
}
