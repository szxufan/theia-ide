#!/usr/bin/env node
/**
 * 快速编译 theia 子模块中的单个/多个包（增量 tsc），避免每次全量 build:dev。
 *
 * 用法：
 *   pnpm theia:compile <包名>...        # 包名可省略 packages/ 前缀，如 ai-editor
 *   pnpm build:quick <包名>...          # 编译后顺带跳过 theia 重编重建 IDE 应用
 *                                       # （等价于 theia:compile + build:fast）
 */
// @ts-check
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const rebuildApps = args.includes('--rebuild-apps');
const names = args.filter(arg => !arg.startsWith('--'));

const repoRoot = path.resolve(__dirname, '..');
const theiaDir = path.join(repoRoot, 'theia');

function usage() {
    console.log('用法：node scripts/compile-theia.js [--rebuild-apps] <包名>...');
    console.log('  包名可写 ai-editor 或 packages/ai-editor；--rebuild-apps 会在编译后增量重建应用。');
}

if (names.length === 0 && !rebuildApps) {
    usage();
    process.exit(1);
}
if (!fs.existsSync(path.join(theiaDir, 'package.json'))) {
    console.error('未找到 theia 子模块，请先运行：git submodule update --init theia');
    process.exit(1);
}

const targets = [];
for (const name of names) {
    const rel = name.includes('/') ? name : `packages/${name}`;
    if (!fs.existsSync(path.join(theiaDir, rel, 'tsconfig.json'))) {
        console.error(`找不到包：${rel}（目录下需有 tsconfig.json）`);
        process.exit(1);
    }
    targets.push(rel);
}

if (targets.length > 0) {
    console.log(`[compile-theia] tsc -b ${targets.join(' ')}`);
    const tscBin = process.platform === 'win32'
        ? path.join('node_modules', '.bin', 'tsc.cmd')
        : path.join('node_modules', '.bin', 'tsc');
    const result = spawnSync(`"${tscBin}" -b ${targets.map(t => `"${t}"`).join(' ')}`, {
        cwd: theiaDir,
        stdio: 'inherit',
        shell: true
    });
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

if (rebuildApps) {
    console.log('[compile-theia] 增量重建扩展与应用（跳过 theia 重编、pnpm install 与原生模块重建）');
    const result = spawnSync(
        `node "${path.join(__dirname, 'build-with-local-theia.js')}" --skip-theia-build --skip-plugins --skip-install --quick-apps`, {
        cwd: repoRoot,
        stdio: 'inherit',
        shell: true
    });
    process.exit(result.status ?? 0);
}
