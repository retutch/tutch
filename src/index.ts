import * as Ast from './ast';
import { Parser, Grammar } from 'nearley';
import { checkProof, Justification } from './check';
import { Proof, Proposition } from './parse/restrict';
import { ImpossibleError, ParsingError, NoJustificationError } from './error';
const rules = require('../dist/rules');
const proposition = require('../dist/proposition');
export { ImpossibleError, ParsingError } from './error';
export { Justification } from './check';
export * from './ast';

export function parseGrammar(grammar: Grammar, str: string) {
    const parser = new Parser(grammar);
    let syn: any[];
    try {
        parser.feed(str);
        syn = parser.finish();
    } catch (err: any) {
        /* istanbul ignore else  */
        if (err.token) {
            throw new ParsingError(
                {
                    loc: {
                        start: { line: err.token.line, column: err.token.col },
                        end: { line: err.token.line, column: err.token.col + err.token.text.length },
                        source: err.token.text,
                    },
                },
                `Unexpected input ${err.token.text}`
            );
        } else {
            console.log(err);
            throw new ImpossibleError('Error with no token');
        }
    }
    if (syn.length === 0) {
        // TODO: Better error message here
        throw new ParsingError({}, `Incomplete parse at the end of the file`);
    }
    /* istanbul ignore if  */
    if (syn.length !== 1) throw new ImpossibleError(`Ambiguous parse of ${str} (${syn.length} parses)`);
    return syn[0];
}

export function parseProp(str: string): any {
    const syn = parseGrammar(Grammar.fromCompiled(proposition), str);
    const ast = Proposition(syn);
    return ast;
}

export function parse(str: string): Ast.Proof[] {
    const syn = parseGrammar(Grammar.fromCompiled(rules), str);
    const ast = syn.map(Proof);
    return ast;
}

export function evaluate(proofs: Ast.Proof[]): Justification[] {
    const lemmas = new Map<string, Ast.Proposition>();
    const justs = proofs.reduce((justs: Justification[], proof) => {
        const newJusts = checkProof(proof, lemmas);
        lemmas.set(proof.name, proof.goal);
        return justs.concat(newJusts);
    }, []);
    return justs;
}

export function evaluateAssert(proofs: Ast.Proof[]) {
    evaluate(proofs).forEach((just) => {
        if (just.type === 'NotJustified') throw new NoJustificationError('', just);
    });
}
