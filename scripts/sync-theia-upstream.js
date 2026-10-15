#!/usr/bin/env node

/**
 * Sync commits and tags from the upstream Theia repository
 * (https://github.com/eclipse-theia/theia) into the fork used by the
 * `theia` git submodule (origin, e.g. git@github.com:szxufan/theia.git).
 *
 * This is needed when the submodule wants to pin a commit that the fork
 * does not contain yet (e.g. a new `vX.Y.Z` release tag or a fresh master
 * commit). Note that Theia publishes `1.X.0-next.*` npm pre-releases from
 * master commits without creating tags for them; the matching commit can
 * be found via `npm view @theia/core@<version> gitHead`.
 *
 * Usage:
 *   node scripts/sync-theia-upstream.js [options]
 *
 * Options:
 *   --upstream-url <url>  Upstream remote URL [default: https://github.com/eclipse-theia/theia.git]
 *   --push                Also fast-forward origin/master and push missing tags
 *                         to the fork (requires push access to the fork)
 *   --dry-run             Print commands without executing them
 *   --help                Show this help message
 *
 * Without --push this only fetches upstream into the submodule's local
 * refs, so a missing commit can be checked out and pinned right away;
 * pushing to the fork keeps it complete for other clones.
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const THEIA_DIR = path.join(ROOT_DIR, 'theia');
const DEFAULT_UPSTREAM_URL = 'https://github.com/eclipse-theia/theia.git';

const args = process.argv.slice(2);

function getArgValue(flag, defaultValue) {
    const index = args.indexOf(flag);
    if (index !== -1 && args[index + 1]) {
        return args[index + 1];
    }
    return defaultValue;
}

const options = {
    upstreamUrl: getArgValue('--upstream-url', process.env.THEIA_UPSTREAM_URL || DEFAULT_UPSTREAM_URL),
    push: args.includes('--push'),
    dryRun: args.includes('--dry-run'),
    help: args.includes('--help')
};

if (options.help) {
    console.log(require('fs').readFileSync(__filename, 'utf-8'));
    process.exit(0);
}

function run(cmd, description = '') {
    if (description) {
        console.log(`\n> ${description}`);
    }
    console.log(`$ ${cmd}`);
    if (options.dryRun) {
        return '';
    }
    return execSync(cmd, { cwd: THEIA_DIR, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf-8' }).trim();
}

function tryRun(cmd, description = '') {
    try {
        return run(cmd, description);
    } catch {
        return null;
    }
}

function main() {
    if (!require('fs').existsSync(path.join(THEIA_DIR, '.git'))) {
        console.error(`Error: theia submodule not found at ${THEIA_DIR}`);
        console.error('Initialize it first: pnpm theia:init');
        process.exit(1);
    }

    console.log('Sync theia submodule from upstream\n');
    console.log(`Upstream: ${options.upstreamUrl}`);

    const remotes = run('git remote', 'List remotes').split('\n').map(r => r.trim()).filter(Boolean);
    if (!remotes.includes('upstream')) {
        run(`git remote add upstream ${options.upstreamUrl}`, 'Add upstream remote');
    } else {
        // Keep any existing upstream URL untouched: it may have been
        // overridden to SSH on networks where https://github.com is blocked.
        console.log('upstream remote already configured');
    }

    run('git fetch upstream --tags --prune', 'Fetch upstream commits and tags');

    // Which upstream tags are missing on the fork (origin)?
    const originTags = new Set(
        (tryRun('git ls-remote --tags origin') || '').split('\n')
            .map(line => (line.match(/refs\/tags\/(.*)$/) || [])[1])
            .filter(Boolean)
            .map(tag => tag.replace(/\^\{\}$/, ''))
    );
    const localTags = run('git tag --list').split('\n').map(t => t.trim()).filter(Boolean);
    const missingTags = localTags.filter(tag => !originTags.has(tag));

    // Is the fork's master behind upstream?
    let behind = false;
    const contains = tryRun('git merge-base --is-ancestor upstream/master origin/master');
    if (contains === null) {
        // exit code != 0: origin/master does not contain upstream/master
        behind = true;
    }

    console.log('');
    if (missingTags.length > 0) {
        console.log(`Tags missing on the fork (${missingTags.length}): ${missingTags.slice(0, 20).join(', ')}${missingTags.length > 20 ? ' ...' : ''}`);
    } else {
        console.log('No tags missing on the fork.');
    }
    console.log(behind
        ? 'The fork (origin/master) is behind upstream/master.'
        : 'The fork (origin/master) is up to date with upstream/master.');

    if (!options.push) {
        console.log(`
Done (fetch only). The upstream commits and tags are now available locally,
so any commit can be checked out and pinned:
  git -C theia checkout <commit>
  git add theia

To also fast-forward the fork and push missing tags, re-run with --push.`);
        return;
    }

    if (behind) {
        run('git push origin refs/remotes/upstream/master:refs/heads/master', 'Fast-forward origin/master to upstream/master');
    }
    if (missingTags.length > 0) {
        run(`git push origin ${missingTags.map(t => `refs/tags/${t}`).join(' ')}`, 'Push missing tags to the fork');
    }
    console.log('\nDone. The fork now contains all upstream commits and tags.');
}

try {
    main();
} catch (error) {
    console.error(`\nSync failed: ${error.message}`);
    process.exit(1);
}
