import { Proposition, ProofStep, SourceLocation, Syn, Proof, equalProps } from './ast';
import { ImpossibleError, NoJustificationError } from './error';

export type Justification = Justified | NotJustified;

export interface Justified extends Syn {
    type: 'Justified';
    rule?: string;
    loc: SourceLocation;
    by: SourceLocation[];
}

export interface NotJustified extends Syn {
    type: 'NotJustified';
    message?: string;
    loc: SourceLocation;
}


interface Inference extends Syn {
    type: 'Inference';
    premise: Proposition;
    conclusion: Proposition;
    loc: SourceLocation;
}

type Hyp = Proposition | Inference;
type Gamma = Hyp[];

function inHyps(a: Proposition, gamma: Gamma): Proposition | null {
    for (let hyp of gamma) {
        if (hyp.type !== 'Inference') {
            if (equalProps(a, hyp)) return hyp;
        }
    }
    return null;
}

function implicationInHyps(premise: Proposition, consequent: Proposition, gamma: Gamma): Inference | null {
    for (let hyp of gamma) {
        if (hyp.type === 'Inference') {
            if (equalProps(premise, hyp.premise) && equalProps(consequent, hyp.conclusion)) return hyp;
        }
    }
    return null;
}

function checkProofSteps(gamma: Gamma, steps: ProofStep[]): { justs: Justification[] } {
    const justs = steps.reduce((oldJusts: Justification[], step) => {
        const { hyp, justs: newJusts } = checkProofStep(gamma, step);
        gamma.push(hyp);
        return oldJusts.concat(newJusts);
    }, []);
    return { justs };
}

function checkProofStep(gamma: Gamma, step: ProofStep): { hyp: Hyp; justs: Justification[] } {
    if (step.type === 'HypotheticalProof') {
        // Check a hypothetical proof (multiple steps)
        if (step.hypotheses.length !== 1) throw new ImpossibleError('No hypotheses');
        const gamma2 = gamma.slice().concat([step.hypotheses[0]]);
        const { justs } = checkProofSteps(gamma2, step.steps.concat([step.consequent]));
        const hyp: Hyp = {
            type: 'Inference',
            premise: step.hypotheses[0],
            conclusion: step.consequent,
            loc: step.loc!,
        };
        return { hyp, justs };
    } else {
        // Check whether a single assertion is justified

        // Check for introduction rules
        switch (step.type) {
            case 'PropTrue': {
                return {
                    hyp: step,
                    justs: [
                        {
                            type: 'Justified',
                            rule: 'truth introduction',
                            loc: step.loc!,
                            by: [],
                        },
                    ],
                };
            }
            case 'PropAnd': {
                const left = inHyps(step.left, gamma);
                const right = inHyps(step.right, gamma);
                if (left && right)
                    return {
                        hyp: step,
                        justs: [
                            {
                                type: 'Justified',
                                rule: 'conjunction introduction',
                                loc: step.loc!,
                                by: [left.loc!, right.loc!],
                            },
                        ],
                    };
                break;
            }
            case 'PropImplies': {
                const premise = implicationInHyps(step.left, step.right, gamma);
                if (premise)
                    return {
                        hyp: step,
                        justs: [
                            {
                                type: 'Justified',
                                rule: 'implication introduction',
                                loc: step.loc!,
                                by: [premise.loc],
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
                        hyp: step,
                        justs: [
                            {
                                type: 'Justified',
                                rule: `disjunction introduction ${left ? 'left' : 'right'}`,
                                loc: step.loc!,
                                by: [left ? left.loc! : right!.loc!],
                            },
                        ],
                    };
                break;
            }
        }

        // Check for elimination rules
        for (let hyp of gamma) {
            if (hyp.type !== 'Inference') {
                if (equalProps(step, hyp))
                    return {
                        hyp: step,
                        justs: [
                            {
                                type: 'Justified',
                                rule: 'hypothesis',
                                loc: step.loc!,
                                by: [hyp.loc!],
                            },
                        ],
                    };

                if (hyp.type === 'PropFalse') {
                    return {
                        hyp: step,
                        justs: [
                            {
                                type: 'Justified',
                                rule: 'false elimination (contradiction)',
                                loc: step.loc!,
                                by: [hyp.loc!],
                            },
                        ],
                    };
                } else if (hyp.type === 'PropAnd') {
                    if (equalProps(step, hyp.left))
                        return {
                            hyp: step,
                            justs: [
                                {
                                    type: 'Justified',
                                    rule: 'conjunction elimination left',
                                    loc: step.loc!,
                                    by: [hyp.loc!],
                                },
                            ],
                        };
                    if (equalProps(step, hyp.right))
                        return {
                            hyp: step,
                            justs: [
                                {
                                    type: 'Justified',
                                    rule: 'conjunction elimination right',
                                    loc: step.loc!,
                                    by: [hyp.loc!],
                                },
                            ],
                        };
                } else if (hyp.type === 'PropImplies') {
                    if (equalProps(step, hyp.right)) {
                        const prem = inHyps(hyp.left, gamma);
                        if (prem)
                            return {
                                hyp: step,
                                justs: [
                                    {
                                        type: 'Justified',
                                        rule: 'implication elimination (modus ponens)',
                                        loc: step.loc!,
                                        by: [hyp.loc!, prem.loc!],
                                    },
                                ],
                            };
                    }
                } else if (hyp.type === 'PropOr') {
                    const case1 = implicationInHyps(hyp.left, step, gamma);
                    const case2 = implicationInHyps(hyp.right, step, gamma);
                    if (case1 && case2) {
                        return {
                            hyp: step,
                            justs: [
                                {
                                    type: 'Justified',
                                    rule: 'OrE',
                                    loc: step.loc!,
                                    by: [hyp.loc!, case1.loc, case2.loc],
                                },
                            ],
                        };
                    }
                }
            }
        }

        return {
            hyp: step,
            justs: [
                {
                    type: 'NotJustified',
                    loc: step.loc!,
                },
            ],
        };
    }
}

export function checkProof(proof: Proof): Justification[] {
    const hyps: Hyp[] = [];
    const { justs } = checkProofSteps(hyps, proof.proof.concat([ proof.consequent ]));
    const unjustified = justs.filter(({ type }) => type === 'NotJustified');

    let goalJust: Justification;
    if (unjustified.length === 0) {
        goalJust = {
            type: 'Justified',
            loc: proof.goal.loc!,
            by: [proof.consequent.loc!],
        };
    } else {
        goalJust = {
            type: 'NotJustified',
            message: `Proof contains ${unjustified.length} unjustified proposition${
                unjustified.length === 1 ? '' : 's'
            }`,
            loc: proof.goal.loc!,
        };
    }

    return justs.concat([goalJust]);
}

export function assertProof(proof: Proof) {
    const justs = checkProof(proof);
    justs.forEach(just => {
        if (just.type === 'NotJustified') throw new NoJustificationError('', just.loc);
    });
}
