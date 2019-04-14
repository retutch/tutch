import * as Ast from './ast';
export * from './ast';

export function parse(str: string): Ast.Syn {
    return { type: str };
}

export function evaluate(ast: Ast.Syn) {
    ast;
    return;
}
