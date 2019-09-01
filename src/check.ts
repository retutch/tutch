import { Proposition, ProofStep, SourceLocation, Syn, Proof, equalProps, Hypothesis } from './ast';
import { ImpossibleError, NoJustificationError } from './error';
import { openProp, openProofStep, matchProp } from './substitution';

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
    premises: Hypothesis[];
    conclusion: Proposition;
    loc: SourceLocation;
}

type Hyp = Hypothesis | Inference;
type Gamma = Hyp[];

function inHyps(a: Proposition, gamma: Gamma): Proposition | null {
    for (let hyp of gamma) {
        if (hyp.type !== 'Inference' && hyp.type !== 'VariableDeclaration') {
            if (equalProps(a, hyp)) return hyp;
        }
    }
    return null;
}

function implicationInHyps(premise: Proposition, consequent: Proposition, gamma: Gamma): Inference | null {
    for (let hyp of gamma) {
        if (hyp.type === 'Inference' && hyp.premises.length === 1) {
            const premiseInHyp = hyp.premises[0];
            if (premiseInHyp.type !== 'VariableDeclaration') {
                if (equalProps(premise, premiseInHyp) && equalProps(consequent, hyp.conclusion)) {
                    return hyp;
                }
            }
        }
    }
    return null;
}

function instantiationInHyps(prop: Proposition, gamma: Gamma): Proposition | null {
    for (let hyp of gamma) {
        if (hyp.type !== 'Inference' && hyp.type !== 'VariableDeclaration') {
            if (matchProp(hyp, prop, { contents: null }, 0)) {
                return hyp;
            }
        }
    }
    return null;
}

function generalizationInHyps(prop: Proposition, gamma: Gamma): Inference | null {
    for (let hyp of gamma) {
        if (hyp.type === 'Inference' && hyp.premises.length === 1) {
            const premiseInHyp = hyp.premises[0];
            if (premiseInHyp.type === 'VariableDeclaration') {
                if (equalProps(prop, hyp.conclusion)) {
                    return hyp;
                }
            }
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

function freshRelativeTo(gamma: Gamma, x: string) {
    function inGamma(y: string) {
        return gamma.some(hyp => hyp.type === 'VariableDeclaration' && hyp.variable == y);
    }
    if (!inGamma(x)) return x;
    let i = 0;
    while (inGamma(`${x}${i}`)) i++;
    return `${x}${i}`;
}

function checkProofStep(gamma: Gamma, step: ProofStep): { hyp: Hyp; justs: Justification[] } {
    if (step.type === 'HypotheticalProof') {
        // Check a hypothetical proof (multiple steps)
        if (step.hypotheses.length === 0) throw new ImpossibleError('No hypotheses');

        const closedHyps = step.hypotheses.slice();
        const openHyps = [];
        let steps = step.steps.slice();
        let consequent = step.consequent;
        for (let i = 0; i < step.hypotheses.length; i++) {
            const hyp = closedHyps[i];
            openHyps.push(hyp);
            if (hyp.type === 'VariableDeclaration') {
                const x = freshRelativeTo(gamma, hyp.variable);
                let k = 0;
                for (let j = i + 1; j < step.hypotheses.length; j++) {
                    if (closedHyps[j].type === 'VariableDeclaration') {
                        k++;
                    } else {
                        closedHyps[j] = openProp(closedHyps[j] as Proposition, k, x);
                    }
                }
                steps = steps.map(step => openProofStep(step, k, x));
                consequent = openProp(consequent, k, x);
            }
        }

        const gamma2 = gamma.slice().concat(closedHyps);
        const { justs } = checkProofSteps(gamma2, steps.concat([consequent]));
        const hyp: Hyp = {
            type: 'Inference',
            premises: step.hypotheses,
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
            case 'PropAll': {
                const premise = generalizationInHyps(step.argument, gamma);
                if (premise)
                    return {
                        hyp: step,
                        justs: [
                            {
                                type: 'Justified',
                                rule: 'universal quantification introduction',
                                loc: step.loc!,
                                by: [premise.loc],
                            },
                        ],
                    };
                break;
            }
            case 'PropExists': {
                const instantiation = instantiationInHyps(step.argument, gamma);
                if (instantiation) {
                    return {
                        hyp: step,
                        justs: [
                            {
                                type: 'Justified',
                                rule: 'existential quantification introduction',
                                loc: step.loc!,
                                by: [instantiation.loc!],
                            }
                        ]
                    }
                }
            }
        }

        // Check for elimination rules
        for (let hyp of gamma) {
            if (hyp.type === 'Inference') {
                if (hyp.premises.length === 2) {
                    const variableDeclaration = hyp.premises[0];
                    const proposition = hyp.premises[1];
                    if (
                        variableDeclaration.type === 'VariableDeclaration' &&
                        proposition.type !== 'VariableDeclaration'
                    ) {
                        if (equalProps(step, hyp.conclusion)) {
                            // Possible use of existential! But is the existential there?
                            const existential = inHyps(
                                {
                                    type: 'PropExists',
                                    variable: variableDeclaration.variable,
                                    sort: variableDeclaration.sort,
                                    argument: proposition,
                                },
                                gamma
                            );

                            if (existential) {
                                return {
                                    hyp: step,
                                    justs: [
                                        {
                                            type: 'Justified',
                                            rule: 'existential quantifier elimination',                                            
                                            loc: step.loc!,
                                            by: [existential.loc!, hyp.loc],
                                        },
                                    ],
                                };
                            }
                        }
                    }
                }
            } else if (hyp.type !== 'VariableDeclaration') {
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
                                    rule: 'disjunction elimination',
                                    loc: step.loc!,
                                    by: [hyp.loc!, case1.loc, case2.loc],
                                },
                            ],
                        };
                    }
                } else if (hyp.type === 'PropAll') {
                    const openTerm = hyp.argument;
                    if (matchProp(step, openTerm, {contents:null}, 0)) {
                        return {
                            hyp: step,
                            justs: [
                                {
                                    type: 'Justified',
                                    rule: 'universial quantification elimination',
                                    loc: step.loc!,
                                    by: [hyp.loc!]
                                }
                            ]
                        }
                    }
                } // forall
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
    const { justs } = checkProofSteps(hyps, proof.proof.concat([proof.consequent]));
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
