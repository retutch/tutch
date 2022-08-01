import { readdirSync, readFileSync, lstatSync } from 'fs';
import { join, extname } from 'path';
import * as Ast from './ast';
import { isJustified, parse, parseProp } from '.';
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

  itShouldParseAndPrint(
    '!x. A(h x (h x x))',
    '(!x:t.A (h #0 (h #0 #0)))',
    '(!x:t.A (h x (h x x)))',
  );
  itShouldParseAndPrint('A x y z', 'A x y z', 'A x y z');
  itShouldParseAndPrint('A => B', '(A => B)', '(A => B)');
  itShouldParseAndPrint('A <=> B', '((A => B) & (B => A))', '((A => B) & (B => A))');
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

const dir = './tests';

export interface Spec {
  outcome: 'error' | 'reject' | 'pass';
  description: string;
}

export function parseSpec(str: string, filename?: string): Spec {
  let spec;
  try {
    const specParser = new Parser(Grammar.fromCompiled(testSpecRules));
    specParser.feed(str);
    spec = specParser.finish()[0];
  } catch (err) {
    throw new Error(`Error parsing test spec ${filename ? `for ${filename}` : ''}:\n${err}`);
  }

  switch (spec[1][0]) {
    case 'error':
      return { outcome: 'error', description: 'be flagged as an ill-formed file' };
    case 'reject':
      return { outcome: 'reject', description: 'be rejected' };
    case 'pass':
      return { outcome: 'pass', description: 'pass' };
    /* istanbul ignore next */
    default:
      throw new Error(
        `Unexpected condition ${spec[1][0]}.  (This error should be impossible, there is a bug!)`,
      );
  }
}

function testfile(filepath: string) {
  const contents = readFileSync(filepath, { encoding: 'binary' });
  const spectxt = contents.match(/(% test .*(\r|\n|\n\r|\r\n))+/);
  if (spectxt === null) {
    console.warn(`No specs in file ${filepath}`);
    return;
  }

  let spec: Spec;
  try {
    spec = parseSpec(spectxt[0], filepath);
    test(`${filepath} should ${spec.description}`, async () => {
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
  } catch (err: any) {
    // Will always fail
    expect(err).not.toBeTruthy();
  }
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
