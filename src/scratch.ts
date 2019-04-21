import { readFileSync } from 'fs';
import { Proof } from './parse/restrict';
import { parse } from '.';

function testFile(filepath: string) {
    const contents = readFileSync(filepath, { encoding: 'binary' });
    const syn = parse(contents)[0];
    const ast = syn.map(Proof);
    console.log(JSON.stringify(ast, undefined, 4));
}

testFile('tests/prop/mp-pass.tut');
