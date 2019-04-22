import * as Ast from './ast';
import { Parser, Grammar } from 'nearley';
import { checkProofSteps, equalProps } from './check';
import { Proof } from './parse/restrict';
export * from './ast';
const rules = require('../dist/rules');

export function parse(str: string): Ast.Proof[] {
    const parser = new Parser(Grammar.fromCompiled(rules));
    parser.feed(str);
    const syn = parser.finish();
    const ast = syn[0].map(Proof);
    return ast;
}

export function evaluate(proofs: Ast.Proof[]) {
    for (let proof of proofs) {
        const last = checkProofSteps([], proof.proof);
        if (!equalProps(last, proof.goal)) throw new Error('Not matching');
    }
}
