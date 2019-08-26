import 'mocha';
import { expect } from 'chai';
import { parseProp } from '..';
import * as Ast from '../ast';

function parsePrint(str: string) {
    return Ast.propToString([], parseProp(str));
}

describe('The proposition parser', () => {
    it('should correctly reject bad propositions', () => {
        expect(() => parseProp(''))
            .to.throw()
            .that.has.property('name')
            .that.equals('ParsingError');
        expect(() => parseProp('('))
            .to.throw()
            .that.has.property('name')
            .that.equals('ParsingError');
        expect(() => parseProp('☄'))
            .to.throw()
            .that.has.property('name')
            .that.equals('ParsingError');
        expect(() => parseProp('lower & Upper'))
            .to.throw()
            .that.has.property('name')
            .that.equals('ParsingError');
        expect(() => parseProp('Upper & lower'))
            .to.throw()
            .that.has.property('name')
            .that.equals('ParsingError');
        expect(() => parseProp('!x:custom. A'))
            .to.throw()
            .that.has.property('name')
            .that.equals('ParsingError');
        expect(() => parseProp('nat => A'))
            .to.throw()
            .that.has.property('name')
            .that.equals('ParsingError');
        expect(() => parseProp('A & let'))
            .to.throw()
            .that.has.property('name')
            .that.equals('ParsingError');
        expect(() => parseProp('!A:t. B'))
            .to.throw()
            .that.has.property('name')
            .that.equals('ParsingError');
        expect(() => parseProp('?A:t. B'))
            .to.throw()
            .that.has.property('name')
            .that.equals('ParsingError');
        expect(() => parseProp('A x y & B y C'))
            .to.throw()
            .that.has.property('name')
            .that.equals('ParsingError');
        expect(() => parseProp('A B'))
            .to.throw()
            .that.has.property('name')
            .that.equals('ParsingError');
    });

    it('should parse precedence correctly', () => {
        expect(parsePrint('A x y z')).to.equal('(A x y z)');
        expect(parsePrint('A => B')).to.equal('(A => B)');
        expect(parsePrint('A => B => C')).to.equal('(A => (B => C))');
        expect(parsePrint('A & B => C & D')).to.equal('((A & B) => (C & D))');
        expect(parsePrint('A & !a:t. B & C')).to.equal('(A & (!a:t.(B & C)))');
        expect(parsePrint('A => !a:t. B & C')).to.equal('(A => (!a:t.(B & C)))');
        expect(parsePrint('A & !a:t. B => C')).to.equal('(A & (!a:t.(B => C)))');
        expect(parsePrint('A | ?a:t. B => C')).to.equal('(A | (?a:t.(B => C)))');
        expect(parsePrint('A => ?a:t. B | C')).to.equal('(A => (?a:t.(B | C)))');
    });
});
