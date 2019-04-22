import { readFileSync } from 'fs';
import { parse } from '.';

function testFile(filepath: string) {
    const contents = readFileSync(filepath, { encoding: 'binary' });
    const ast = parse(contents);
    console.log(JSON.stringify(ast, undefined, 4));
}

testFile('tests/prop/mp-pass.tut');
