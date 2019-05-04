import { readFileSync, readdirSync, lstatSync } from 'fs';
import { parseSpec, Spec } from './parsespec';
import 'mocha';
import { expect } from 'chai';
import { Proof } from '../ast';
import { parse, evaluateAssert } from '..';
import { join, extname } from 'path';

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
    } catch (err) {
        console.log(err.message);
        specs = [];
    }

    specs.forEach((spec, i) => {
        it(`test ${filepath}${i ? `.${i}` : ''}, should ${spec.description}`, () => {
            let ast: Proof[];
            if (spec.outcome === 'error') {
                expect(() => {
                    ast = parse(contents);
                }).to.throw();
            } else {
                expect(() => {
                    ast = parse(contents);
                }).not.to.throw();
            }

            if (spec.outcome === 'reject') {
                expect(() => evaluateAssert(ast)).to.throw();
            }

            if (spec.outcome === 'pass') {
                expect(() => evaluateAssert(ast)).not.to.throw();
            }
        });
    });
}

const dir = './tests';
readdirSync(dir).forEach(subdir => {
    if (lstatSync(join(dir, subdir)).isDirectory()) {
        describe(`Tests in suite ${subdir}`, () => {
            readdirSync(join(dir, subdir)).forEach(file => {
                const ext = extname(file);
                if (ext === '.tut') {
                    testfile(join(dir, subdir, file));
                }
            });
        });
    }
});
