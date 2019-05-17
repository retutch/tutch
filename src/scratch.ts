import { readFileSync } from 'fs';
import { parse, evaluate } from '.';

function testFile(filepath: string) {
    const contents = readFileSync(filepath, { encoding: 'binary' });
    const ast = parse(contents);
    const just = evaluate(ast);
    console.log(JSON.stringify(just, undefined, 4));
}

testFile('tests/prop/mp-pass.tut');
