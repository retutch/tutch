import { Proposition, ProofStep, SourceLocation, Syn, Proof } from './ast';

export type Justification = Justified | NotJustified;

export interface Justified extends Syn {
    type: 'Justified';
    rule?: string;
}

export interface NotJustified extends Syn {
    type: 'NotJustified';
    message?: string;
}

export class NoJustification extends Error {
    public readonly name: 'NoJustification' = 'NoJustification';
    loc: SourceLocation | undefined;
    constructor(msg: string, elem?: Syn | SourceLocation) {
        super(msg);
        if (!elem) return;
        if ('type' in elem) this.loc = elem.loc;
        else this.loc = elem;
    }
}

type Hyp =
    | { type: 'prop'; prop: Proposition; rule: string }
    | { type: 'implication'; hyps: Proposition[]; consequent: Proposition };
type Gamma = Hyp[];

function equalProps(a: Proposition, b: Proposition): boolean {
    switch (a.type) {
        case 'Atom':
            return a.type === b.type && a.predicate === b.predicate;
        case 'PropTrue':
        case 'PropFalse':
            return a.type === b.type;
        case 'PropAnd':
        case 'PropImplies':
        case 'PropOr':
            return a.type === b.type && equalProps(a.left, b.left) && equalProps(a.right, b.right);
        default:
            return a;
    }
}

function inHyps(a: Proposition, gamma: Gamma): Hyp | null {
    for (let hyp of gamma) {
        if (hyp.type === 'prop') {
            if (equalProps(a, hyp.prop)) return hyp;
        }
    }
    return null;
}

function implicationInHyps(premise: Proposition, consequent: Proposition, gamma: Gamma): Hyp | null {
    for (let hyp of gamma) {
        if (hyp.type === 'implication') {
            if (
                hyp.hyps.length === 1 &&
                equalProps(premise, hyp.hyps[0]) &&
                equalProps(consequent, hyp.consequent)
            )
                return hyp;
        }
    }
    return null;
}

function checkProofSteps(gamma: Gamma, steps: ProofStep[]): { proves: Proposition; justs: Justification[] } {
    const justs = steps.reduce((oldJusts: Justification[], step) => {
        const { hyp, justs: newJusts } = checkProofStep(gamma, step);
        gamma.push(hyp);
        return oldJusts.concat(newJusts);
    }, []);

    const proves = steps[steps.length - 1];
    if (proves.type === 'HypotheticalProof') throw new Error('Syntax');
    return { proves, justs };
}

function checkProofStep(gamma: Gamma, step: ProofStep): { hyp: Hyp; justs: Justification[] } {
    if (step.type === 'HypotheticalProof') {
        const gamma2 = gamma
            .slice()
            .concat(step.hypotheses.map(prop => ({ type: 'prop', prop, rule: 'Assumption' })));
        const { proves, justs } = checkProofSteps(gamma2, step.steps);
        const hyp: Hyp = { type: 'implication', hyps: step.hypotheses, consequent: proves };
        return { hyp, justs };
    } else {
        // Check for introduction rules
        switch (step.type) {
            case 'PropTrue': {
                return {
                    hyp: { type: 'prop', prop: step, rule: 'TrueI' },
                    justs: [
                        {
                            type: 'Justified',
                            rule: 'TrueI',
                            loc: step.loc,
                            range: step.range,
                        },
                    ],
                };
            }
            case 'PropAnd': {
                const left = inHyps(step.left, gamma);
                const right = inHyps(step.right, gamma);
                if (left && right)
                    return {
                        hyp: { type: 'prop', prop: step, rule: 'AndI' },
                        justs: [
                            {
                                type: 'Justified',
                                rule: 'AndI',
                                loc: step.loc,
                                range: step.range,
                            },
                        ],
                    };
                break;
            }
            case 'PropImplies': {
                const premise = implicationInHyps(step.left, step.right, gamma);
                if (premise)
                    return {
                        hyp: { type: 'prop', prop: step, rule: 'ImpI' },
                        justs: [
                            {
                                type: 'Justified',
                                rule: 'ImpI',
                                loc: step.loc,
                                range: step.range,
                            },
                        ],
                    };
                break;
            }
            case 'PropOr': {
                const left = inHyps(step.left, gamma);
                const right = inHyps(step.right, gamma);
                if (left || right)
                    return {
                        hyp: { type: 'prop', prop: step, rule: 'Ori' },
                        justs: [
                            {
                                type: 'Justified',
                                rule: left ? 'OrIL' : 'OrIR',
                                loc: step.loc,
                                range: step.range,
                            },
                        ],
                    };
                break;
            }
        }

        // Check for elimination rules
        for (let hyp of gamma) {
            if (hyp.type === 'prop') {
                if (equalProps(step, hyp.prop))
                    return {
                        hyp: { type: 'prop', prop: step, rule: 'Identity' },
                        justs: [
                            {
                                type: 'Justified',
                                rule: 'Identity',
                                loc: step.loc,
                                range: step.range,
                            },
                        ],
                    };

                if (hyp.prop.type === 'PropFalse') {
                    return {
                        hyp: { type: 'prop', prop: step, rule: 'FalseE' },
                        justs: [
                            {
                                type: 'Justified',
                                rule: 'FalseE',
                                loc: step.loc,
                                range: step.range,
                            },
                        ],
                    };
                } else if (hyp.prop.type === 'PropAnd') {
                    if (equalProps(step, hyp.prop.left))
                        return {
                            hyp: { type: 'prop', prop: step, rule: 'AndE1' },
                            justs: [
                                {
                                    type: 'Justified',
                                    rule: 'AndE1',
                                    loc: step.loc,
                                    range: step.range,
                                },
                            ],
                        };
                    if (equalProps(step, hyp.prop.right))
                        return {
                            hyp: { type: 'prop', prop: step, rule: 'AndE2' },
                            justs: [
                                {
                                    type: 'Justified',
                                    rule: 'AndE2',
                                    loc: step.loc,
                                    range: step.range,
                                },
                            ],
                        };
                } else if (hyp.prop.type === 'PropImplies') {
                    if (equalProps(step, hyp.prop.right)) {
                        if (inHyps(hyp.prop.left, gamma))
                            return {
                                hyp: { type: 'prop', prop: step, rule: 'ImpE' },
                                justs: [
                                    {
                                        type: 'Justified',
                                        rule: 'ImpE',
                                        loc: step.loc,
                                        range: step.range,
                                    },
                                ],
                            };
                    }
                } else if (hyp.prop.type === 'PropOr') {
                    if (
                        implicationInHyps(hyp.prop.left, step, gamma) &&
                        implicationInHyps(hyp.prop.right, step, gamma)
                    ) {
                        return {
                            hyp: { type: 'prop', prop: step, rule: 'OrE' },
                            justs: [
                                {
                                    type: 'Justified',
                                    rule: 'ImpE',
                                    loc: step.loc,
                                    range: step.range,
                                },
                            ],
                        };
                    }
                }
            }
        }

        return {
            hyp: { type: 'prop', prop: step, rule: 'None!' },
            justs: [
                {
                    type: 'NotJustified',
                    loc: step.loc,
                    range: step.range,
                },
            ],
        };
    }
}

export function checkProof(proof: Proof): Justification[] {
    const { proves, justs } = checkProofSteps([], proof.proof);
    const final: Justification = equalProps(proves, proof.goal)
        ? {
              type: 'Justified',
              loc: proof.goal.loc,
              range: proof.goal.range,
          }
        : {
              type: 'NotJustified',
              message: 'Last step in proof does not match goal',
              loc: proof.goal.loc,
              range: proof.goal.range,
          };
    return justs.concat([final]);
}

export function assertProof(proof: Proof) {
    const justs = checkProof(proof);
    justs.forEach(just => {
        if (just.type === 'NotJustified') throw new Error();
    });
}
