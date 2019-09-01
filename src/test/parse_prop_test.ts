import 'mocha';
import { expect } from 'chai';
import { parseProp } from '..';
import * as Ast from '../ast';

function parsePrint(str: string) {
    return Ast.propToStringDebug(parseProp(str));
}

function itShouldRejectWithParsingError(str: string) {
    it(`should correctly reject '${str}' as a proposition`, () => {
        expect(() => parseProp(str))
            .to.throw()
            .that.has.property('name')
            .that.equals('ParsingError');
    });
}

function itShouldParseAndPrint(input: string, output: string) {
    it(`should parse and print '${input}' as '${output}'`, () => {
        expect(parsePrint(input)).to.equal(output);
    });
}

describe('The proposition parser', () => {
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

    itShouldParseAndPrint('!x. A (h x)', '(!x:t.A (h #0))');
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
