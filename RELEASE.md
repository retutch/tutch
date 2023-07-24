# Release

(This probably includes some redundancy, they're just notes to self so I remember how to do this.)

**FIRST**, change package.json to reflect the new version number, then:

```
npm install
npm run nearley
npm run test
npm run build
npm run prettier
git checkout -b <### whatever ###>
git commit -a -m "New version"
git push --set-upstream origin <### whatever ###>
```

Merge that, then:

```
git checkout main
git pull
git tag <### vX.X.X ###>
git push <### vX.X.X ###>
npm run build
npm publish
```
