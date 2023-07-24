# Tutch

[![Coverage Status](https://coveralls.io/repos/github/retutch/tutch/badge.svg?branch=main)](https://coveralls.io/github/retutch/tutch?branch=main)
[![NPM Module](https://img.shields.io/npm/v/tutch.svg)](https://www.npmjs.com/package/tutch)

A TypeScript implementation of the TUTorial proof CHecker (Tutch), a language that allows natural deduction proofs in constructive logic to be expressed and checked.

This package just consists of the parser and proof checking logic for Tutch, which can be run like this in Node or in a tool like [RunKit](https://npm.runkit.com/tutch).

```javascript
const tutch = require('tutch');

const proofOfK = tutch.parse(`

proof k : A => B => A =
begin
[ A;
  [ B;
    A ];
 B => A ];
A => B => A
end;

`);

tutch.isJustified(proofOfK);
```

If you want to use Tutch, you can go to https://tutch.glitch.me/.

Version 0.3.x of Tutch was used in the Fall 2019 [Computational Applied Logic](https://sites.google.com/a/ncsu.edu/csc-503-f19/) course at North Carolina State University. The Tutch proof checker was origianlly written in Standard ML by Andreas Abel, Bor-Yuh Evan Chang, and Frank Pfenning. Original documentation can be found at http://www2.tcs.ifi.lmu.de/~abel/tutch/

# Release

(This probably includes some redundancy, they're just notes to self so I remember how to do this.)

```
npm install
npm run nearley
npm run test
```

Change package.json to reflect the new version number, then:

```
npm install
npm run build
git checkout -b <### whatever ###>
git commit -a -m "New version"
git push --set-upstream origin <### whatever ###>
```

Merge that, then:

```
git checkout main
git pull
git tag v0.4.0
git push --tags
npm run build
npm publish
```
