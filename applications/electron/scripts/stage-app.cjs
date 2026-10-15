#!/usr/bin/env node
// Stages the electron app into .stage/ and runs electron-builder from there.
//
// Why: electron-builder's node-module collector runs `pnpm list --depth Infinity`
// from the detected pnpm workspace root, which exhausts memory on this monorepo
// (the theia framework packages are workspace members with a huge shared tree).
// The packaged app ships a bundled backend and explicitly excludes node_modules
// (see the "!**node_modules/**" pattern in electron-builder.yml), so the collector
// has nothing useful to gather anyway. Staging into a directory that is its own
// (empty) pnpm workspace makes the collector finish instantly with an empty,
// correct result. Dependencies are stripped from the staged package.json because
// the bundled app does not need them at runtime.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const appDir = path.resolve(__dirname, '..');
const stageDir = path.join(appDir, '.stage');

const copyDir = (src, dst) => {
    fs.cpSync(src, dst, { recursive: true });
};

// Clean previous staging
fs.rmSync(stageDir, { recursive: true, force: true });
fs.mkdirSync(stageDir, { recursive: true });

// Content the packaged app needs (mirrors the `files` patterns of electron-builder.yml)
for (const entry of ['lib', 'src-gen', 'resources', 'scripts', 'entitlements.plist']) {
    copyDir(path.join(appDir, entry), path.join(stageDir, entry));
}
// electron-builder resolves the nsis `license` entry against the project dir
const rootLicense = path.resolve(appDir, '..', '..', 'LICENSE');
if (fs.existsSync(rootLicense)) {
    fs.copyFileSync(rootLicense, path.join(stageDir, 'LICENSE'));
}

// Staged package.json: keep identity metadata, drop dependency declarations
const pkg = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8'));
delete pkg.dependencies;
delete pkg.devDependencies;
delete pkg.optionalDependencies;
delete pkg.peerDependencies;
fs.writeFileSync(path.join(stageDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

// The staged dir is its own (empty) pnpm workspace so the electron-builder
// dependency collector does not walk the monorepo workspace.
fs.writeFileSync(path.join(stageDir, 'pnpm-workspace.yaml'), 'packages: []\n');

// Patch the electron-builder config paths that are relative to the app dir
const electronPkg = JSON.parse(fs.readFileSync(
    path.resolve(appDir, '..', '..', 'node_modules', 'electron', 'package.json'), 'utf8'));
let yml = fs.readFileSync(path.join(appDir, 'electron-builder.yml'), 'utf8');
yml = yml
    .replace('electronDist: ../../node_modules/electron/dist',
        'electronDist: ../../../node_modules/electron/dist')
    .replace(/electronVersion: .*/,
        `electronVersion: ${electronPkg.version}`)
    .replace('from: ../../plugins',
        'from: ../../../plugins')
    .replace(/directories:\r?\n  buildResources: resources/,
        'directories:\n  buildResources: resources\n  output: ../dist');
fs.writeFileSync(path.join(stageDir, 'electron-builder.yml'), yml);

console.log(`Staged electron app into ${stageDir}, running electron-builder...`);

const result = spawnSync('electron-builder', process.argv.slice(2), {
    cwd: stageDir,
    stdio: 'inherit',
    shell: process.platform === 'win32'
});
process.exit(result.status ?? 1);
