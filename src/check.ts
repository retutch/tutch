import { Proposition, ProofStep, PropImplies } from "./ast";

type Hyp = { type: "prop", prop: Proposition, rule: string } |
    { type: "implication", hyps: Proposition[], consequent: Proposition };
type Gamma = Hyp[];

export function equalProps(a: Proposition, b: Proposition): boolean {
    switch (a.type) {
        case "Atom": 
            return a.type === b.type
                && a.predicate === b.predicate;
        case "PropTrue":
            return a.type === b.type;
        case "PropFalse":
            return a.type === b.type;
        case "PropAnd":
            return a.type === b.type
                && equalProps(a.left, b.left)
                && equalProps(a.right, b.right);
        case "PropImplies":
            return a.type === b.type
                && equalProps(a.left, b.left)
                && equalProps(a.right, b.right);
        default: return a;
    }
}

function inHyps(a: Proposition, gamma: Gamma): Hyp | null {
    for (let hyp of gamma) {
        if (hyp.type === "prop") {
            if (equalProps(a, hyp.prop)) return hyp;
        }
    }
    return null;
}

function implicationInHyps(a: PropImplies, gamma: Gamma): Hyp | null {
    for (let hyp of gamma) {
        if (hyp.type === "implication") {
            if (hyp.hyps.length === 1
                && equalProps(a.left, hyp.hyps[0])
                && equalProps(a.right, hyp.consequent))
                return hyp;
        }
    }
    return null;
}

export function checkProofSteps(gamma: Gamma, steps: ProofStep[]): Proposition {
    for (let step of steps) {
        gamma.push(checkProofStep(gamma, step));
    }
    
    const last = steps[steps.length - 1];
    if (last.type === "HypotheticalProof") throw new Error("Syntax");
    return last;
}

function checkProofStep(gamma: Gamma, step: ProofStep): Hyp {
    if (step.type === "HypotheticalProof") {
        const gamma2 = gamma.slice().concat(
            step.hypotheses.map(prop => ({ type: "prop", prop, rule: "Assumption" }))
        );
        const consequent = checkProofSteps(gamma2, step.steps);
        return { type: "implication", hyps: step.hypotheses, consequent };

    } else {
        // Check for introduction rules
        if (step.type === "PropAnd") {
            const left = inHyps(step.left, gamma);
            const right = inHyps(step.right, gamma);
            if (left && right) return { type: "prop", prop: step, rule: 'AndI' };
        } else if (step.type === "PropImplies") {
            const premise = implicationInHyps(step, gamma);
            if (premise) return { type: "prop", prop: step, rule: 'ImpI' };
        }

        // Check for elimination rules
        for (let hyp of gamma) {
            if (hyp.type === "prop") {
                if (equalProps(step, hyp.prop)) return { type: "prop", prop: step, rule: 'Identity' };

                if (hyp.prop.type === "PropAnd") {
                    if (equalProps(step, hyp.prop.left)) return { type: "prop", prop: step, rule: 'AndE1' };
                    if (equalProps(step, hyp.prop.right)) return { type: "prop", prop: step, rule: 'AndE1' };
                } else if (hyp.prop.type === "PropImplies") {
                    if (equalProps(step, hyp.prop.right)) {
                        if (inHyps(hyp.prop.left, gamma)) return { type: "prop", prop: step, rule: 'ImpE' };
                    }
                }
            }
        }
        throw new Error(`Could not justify step`)
    }
}