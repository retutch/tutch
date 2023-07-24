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
