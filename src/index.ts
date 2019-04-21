import * as Ast from './ast';
import { Parser, Grammar } from 'nearley';
export * from './ast';
const rules = require("../dist/rules");

export function parse(str: string): any {
    const parser = new Parser(Grammar.fromCompiled(rules));
    parser.feed(str);
    return parser.finish();
}

export function evaluate(ast: Ast.Syn) {
    ast;
    return;
}
