import { randomWeightedChoice, squashLiterals, squashNames } from './util.js';
import randexp from 'randexp';

export default class NearleyGenerator {
    constructor(nearleyGrammar) {
        this.rules = this.optimize(nearleyGrammar.ParserRules);
        this._cFactor = 0.5;
    }

    optimize(rules) {
        let ret = rules.map(x => ({ name: x.name, production: Array.from(squashLiterals(x.symbols)) }));

        ret = ret.sort((a, b) => {
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
        });

        ret = Array.from(squashNames(ret));

        for (let rule of ret) {
            rule.productions = rule.productions.map(prod => {
                return prod.map(token => {
                    if (typeof(token) === 'string') return { rule: ret.find(x => x.name === token) };
                    if (token instanceof RegExp) return { regex: token };
                    return token;
                });
            });
            rule._seen = 0;
        }

        return ret;
    }

    generate(symbol, convergence) {
        this._cFactor = convergence;
        return this._generate(this.rules.find(x => x.name == symbol));
    }

    _generate(rule) {
        let weights = rule.productions.map(prod => {
            let seen = 0;
            for (let token of prod) {
                if (token.rule) seen = (token.rule._seen > seen) ? token.rule._seen : seen;
            }
            return Math.pow(this._cFactor, seen);
        });

        let prod = randomWeightedChoice(rule.productions, weights);

        let ret = prod.map(token => {
            if (token.rule) {
                token.rule._seen += 1;
                let gen = this._generate(token.rule);
                token.rule._seen -= 1;
                return gen;
            } else if (token.literal) {
                return token.literal;
            } else if (token.regex) {
                return new randexp(token.regex).gen();
            }
        });

        return ret.join('');
    }
}
