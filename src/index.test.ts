import { readdirSync, readFileSync, lstatSync } from 'fs';
import { join, extname } from 'path';
import * as Ast from './ast';
import { evaluateAssert, isJustified, parse, parseProp } from '.';
import { Parser, Grammar } from 'nearley';

const testSpecRules = require('../dist/spec-rules');

function itShouldRejectWithParsingError(str: string) {
  test(`cannot parse '${str}' as a proposition`, async () => {
    expect(() => parseProp(str)).toThrowErrorMatchingSnapshot();
  });
}

function itShouldParseAndPrint(input: string, outputDebug: string, outputPretty?: string) {
  test(`parsing and printing '${input}' produces '${outputDebug}' / '${outputPretty}'`, async () => {
    expect(Ast.propToStringDebug(parseProp(input))).toEqual(outputDebug);
    expect(Ast.propToString([], parseProp(input))).toEqual(outputPretty || 'x');
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

  itShouldParseAndPrint('!x. A(h x)', '(!x:t.A (h #0))', '(!x:t.A (h x))');
  itShouldParseAndPrint('A x y z', 'A x y z', 'A x y z');
  itShouldParseAndPrint('A => B', '(A => B)', '(A => B)');
  itShouldParseAndPrint('A => B => C', '(A => (B => C))', '(A => (B => C))');
  itShouldParseAndPrint('A & B => C & D', '((A & B) => (C & D))', '((A & B) => (C & D))');
  itShouldParseAndPrint('A & !a:t. B & C', '(A & (!a:t.(B & C)))', '(A & (!a:t.(B & C)))');
  itShouldParseAndPrint('A => !a:t. B & C', '(A => (!a:t.(B & C)))', '(A => (!a:t.(B & C)))');
  itShouldParseAndPrint('A & !a:t. B => C', '(A & (!a:t.(B => C)))', '(A & (!a:t.(B => C)))');
  itShouldParseAndPrint('A | ?a:t. B => C', '(A | (?a:t.(B => C)))', '(A | (?a:t.(B => C)))');
  itShouldParseAndPrint('A => ?a:t. B | C', '(A => (?a:t.(B | C)))', '(A => (?a:t.(B | C)))');
  itShouldParseAndPrint(
    'F => ?a:t. B a | C b',
    '(F => (?a:t.(B #0 | C b)))',
    '(F => (?a:t.(B a | C b)))',
  );
  itShouldParseAndPrint(
    'T => !b:t. B a | C b',
    '(T => (!b:t.(B a | C #0)))',
    '(T => (!b:t.(B a | C b)))',
  );
  itShouldParseAndPrint('!a. ?b. A a b c', '(!a:t.(?b:t.A #1 #0 c))', '(!a:t.(?b:t.A a b c))');
  itShouldParseAndPrint(
    '?x. A x & ?x. A x',
    '(?x:t.(A #0 & (?x:t.A #0)))',
    '(?x:t.(A x & (?x1:t.A x1)))',
  );
  itShouldParseAndPrint(
    '!x. A x & !x. A x',
    '(!x:t.(A #0 & (!x:t.A #0)))',
    '(!x:t.(A x & (!x1:t.A x1)))',
  );
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
    throw new Error(
      'Test spec parsing ambiguous.  (This error should be impossible, there is a bug!)',
    );
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
          throw new Error(
            `Unexpected condition ${cond}.  (This error should be impossible, there is a bug!)`,
          );
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
