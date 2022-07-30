import { readdirSync, readFileSync, lstatSync } from 'fs';
import { join, extname } from 'path';
import * as Ast from './ast';
import { evaluateAssert, isJustified, parse, parseProp } from '.';
import { Parser, Grammar } from 'nearley';
import { ImpossibleError } from './error';
//import { Proof } from './ast';

const testSpecRules = require('../dist/spec-rules');

function itShouldRejectWithParsingError(str: string) {
    test(`cannot parse '${str}' as a proposition`, async () => {
        expect(() => parseProp(str)).toThrowErrorMatchingSnapshot();
    });
}

function itShouldParseAndPrint(input: string, output: string) {
    test(`parsing and printing '${input}' produces '${output}'`, async () => {
        expect(Ast.propToStringDebug(parseProp(input))).toEqual(output);
    });
}

describe('proposition parser', () => {
    itShouldRejectWithParsingError('');
    itShouldRejectWithParsingError('(');
    itShouldRejectWithParsingError(')');
    itShouldRejectWithParsingError('☄');
    itShouldRejectWithParsingError('lower & Upper');
    itShouldRejectWithParsingError('Upper & lower');
    itShouldRejectWithParsingError('!x:custom.A');
    itShouldRejectWithParsingError('nat => A');
    itShouldRejectWithParsingError('A & let');
    itShouldRejectWithParsingError('!A:t. B');
    itShouldRejectWithParsingError('?A:t. B');
    itShouldRejectWithParsingError('A x y & B y C');
    itShouldRejectWithParsingError('!h. A (h x)');
    itShouldRejectWithParsingError('A B');

    itShouldParseAndPrint('!x. A(h x)', '(!x:t.A (h #0))');
    itShouldParseAndPrint('A x y z', 'A x y z');
    itShouldParseAndPrint('A => B', '(A => B)');
    itShouldParseAndPrint('A => B => C', '(A => (B => C))');
    itShouldParseAndPrint('A & B => C & D', '((A & B) => (C & D))');
    itShouldParseAndPrint('A & !a:t. B & C', '(A & (!a:t.(B & C)))');
    itShouldParseAndPrint('A => !a:t. B & C', '(A => (!a:t.(B & C)))');
    itShouldParseAndPrint('A & !a:t. B => C', '(A & (!a:t.(B => C)))');
    itShouldParseAndPrint('A | ?a:t. B => C', '(A | (?a:t.(B => C)))');
    itShouldParseAndPrint('A => ?a:t. B | C', '(A => (?a:t.(B | C)))');
    itShouldParseAndPrint('F => ?a:t. B a | C b', '(F => (?a:t.(B #0 | C b)))');
    itShouldParseAndPrint('T => !b:t. B a | C b', '(T => (!b:t.(B a | C #0)))');
    itShouldParseAndPrint('!a. ?b. A a b c', '(!a:t.(?b:t.A #1 #0 c))');
    itShouldParseAndPrint('?x. A x & ?x. A x', '(?x:t.(A #0 & (?x:t.A #0)))');
    itShouldParseAndPrint('!x. A x & !x. A x', '(!x:t.(A #0 & (!x:t.A #0)))');
});

describe('evaluateAssert', () => {
    test('succeeds on a valid proof', async () => {
        expect(() => evaluateAssert(parse('proof x : T = begin T end;'))).not.toThrow();
    });
    test('throws on an invalid proof', async () => {
        expect(() => evaluateAssert(parse('proof x : F = begin F end;'))).toThrow();
    });
});


const dir = './tests';

export interface Spec {
    outcome: 'error' | 'reject' | 'pass';
    description: string;
}

export function parseSpec(spec: string, filename?: string): Spec[] {
    let specs;
    try {
        const specParser = new Parser(Grammar.fromCompiled(testSpecRules));
        specParser.feed(spec);
        specs = specParser.finish();
    } catch (err) {
        throw new Error(`Error parsing test spec ${filename ? `for ${filename}` : ''}:\n${err}`);
    }

    if (specs.length === 0) throw new Error('No test spec found');
    /* istanbul ignore next */
    if (specs.length > 1) {
        throw new ImpossibleError('Test spec parsing ambiguous');
    }

    return specs[0][0].map((spec: any) => {
        return ((cond: string): Spec => {
            switch (cond) {
                case 'error':
                    return { outcome: 'error', description: 'be flagged as an ill-formed file' };
                case 'reject':
                    return { outcome: 'reject', description: 'be rejected' };
                case 'pass':
                    return { outcome: 'pass', description: 'pass' };
                /* istanbul ignore next */
                default:
                    throw new Error(`Unexpected condition ${cond} (should be impossible, please report)`);
            }
        })(spec[2][0]);
    });
}

function testfile(filepath: string) {
    const contents = readFileSync(filepath, { encoding: 'binary' });
    const spectxt = contents.match(/(% test .*(\r|\n|\n\r|\r\n))+/);
    if (spectxt === null) {
        console.warn(`No specs in file ${filepath}`);
        return;
    }

    let specs: Spec[];
    try {
        specs = parseSpec(spectxt[0], filepath);
    } catch (err: any) {
        console.log(err.message);
        specs = [];
    }

    specs.forEach((spec, i) => {
        test(`${filepath}${i ? `.${i}` : ''} should ${spec.description}`, async () => {
            console.log(spec.outcome);
            switch (spec.outcome) {
                case 'error':
                    expect(() => parse(contents)).toThrowErrorMatchingSnapshot();
                    break;
                case 'reject':
                    expect(isJustified(parse(contents))).toEqual(false);
                    break;
                default:
                    expect(isJustified(parse(contents))).toEqual(true);
                    break;
            }
        });
    });
}

readdirSync(dir).forEach((subdir) => {
    if (lstatSync(join(dir, subdir)).isDirectory()) {
        describe(`Tests in suite ${subdir}`, () => {
            readdirSync(join(dir, subdir)).forEach((file) => {
                const ext = extname(file);
                if (ext === '.tut') {
                    testfile(join(dir, subdir, file));
                }
            });
        });
    }
});
