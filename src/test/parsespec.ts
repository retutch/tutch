import { Parser, Grammar } from 'nearley';
const testSpecRules = require('../../dist/spec-rules');

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
        throw new Error('Test spec parsing ambiguous (should be impossible, please report)');
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
