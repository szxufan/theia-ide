# Developing with the Theia Framework Submodule

This guide explains how to build and test the Theia IDE against the
[Theia framework](https://github.com/eclipse-theia/theia) git submodule. This is useful when you need to:

- Test Theia IDE changes against unreleased Theia features
- Debug issues that span both the framework and the Theia IDE
- Develop new Theia features and immediately test them in the Theia IDE

The framework lives in the `theia` submodule, a fork of
[eclipse-theia/theia](https://github.com/eclipse-theia/theia) at
`https://github.com/szxufan/theia.git`. **Building from the submodule is the
default**: `yarn build`, `yarn build:dev`, `yarn build:next` and
`yarn build:next:dev` all compile the submodule first and link its packages
into the IDE build.

## Prerequisites

- Node.js and npm installed (see [Theia prerequisites](https://github.com/eclipse-theia/theia/blob/master/doc/Developing.md#prerequisites))

After cloning this repository, initialize the submodule (the build scripts
also do this automatically when it is missing):

```sh
git submodule update --init theia   # or: yarn theia:init
```

## Submodule Pinning and Versions

The submodule is pinned to the commit whose source was published as the
`@theia/*` version this IDE depends on (e.g. `1.77.0-next.25`). Note that
Theia publishes `1.X.0-next.*` pre-releases from master commits **without
tagging them** and without committing the version bump back to master — the
`package.json` files on master still carry the previous stable version. To
find the commit matching a published version, use the npm metadata:

```sh
npm view @theia/core@<version> gitHead
# e.g. 1.77.0-next.25 -> 73f0462af513c55e6120fe0d759ff777160fafb2
git -C theia checkout <commit>
git add theia   # records the new pin in this repository
```

The build prints a warning when the checked-out framework clearly does not
match the IDE's dependency line.

### Syncing the Fork with Upstream

If the commit or tag you want to pin is missing from the fork
(`szxufan/theia`), sync it from upstream:

```sh
yarn theia:sync             # fetch upstream master + tags into ./theia
yarn theia:sync --push      # also fast-forward the fork and push missing tags
```

You need push access to the fork for `--push`. On networks where GitHub is
only reachable via SSH, rewrite the upstream URL to SSH:

```sh
git config --global url."git@github.com:".insteadOf "https://github.com/"
```

To move the submodule to the fork's latest master:

```sh
yarn theia:update           # git submodule update --remote theia
```

## Important Note

The build does not update the IDE version or Theia package versions in
`package.json` files. It uses the current state of both repositories and
symlinks the submodule's `@theia/*` packages into the IDE's `node_modules`
to override the dependencies. If needed, run versioning commands
(e.g., `yarn update:theia <version>`) separately before building.

## Quick Start

```sh
git submodule update --init theia   # only needed on a fresh clone
yarn build:dev                      # build framework + stable apps (dev mode)
```

`yarn build`, `yarn build:dev`, `yarn build:next` and `yarn build:next:dev`
all delegate to `scripts/build-with-local-theia.js`:

| Script              | What it builds (from the submodule)              |
|---------------------|---------------------------------------------------|
| `yarn build`        | framework + `browser` + `electron` (prod)         |
| `yarn build:dev`    | framework + `browser` + `electron` (dev)          |
| `yarn build:next`   | framework + `electron-next` (prod)                |
| `yarn build:next:dev` | framework + `electron-next` (dev)               |

To build against the npm-published `@theia/*` packages instead of the
submodule (e.g., when tracking a newly published `next` version), use:

```sh
yarn build:npm        # old default: build:extensions + build:applications
yarn build:npm:dev
```

The generic entry point with all options is:

```sh
yarn build:local-theia [-- options]
node scripts/build-with-local-theia.js [options]
```

## What the Script Does

1. Initialize the `theia` submodule if it is missing
2. Warn when the framework checkout does not match the IDE's dependency line
3. Build the framework (`npm ci` + `npm run compile` inside `theia/`)
4. Install the IDE dependencies (`yarn`)
5. Symlink all `@theia/*` packages from the submodule into the IDE's `node_modules`
6. Copy any transitive dependencies that the linked packages need but cannot resolve from the checkout (see [Why some dependencies are copied](#why-some-dependencies-are-copied))
7. Build the Theia IDE extensions and the selected applications (`--apps stable` by default)
8. Download required plugins

The symlinks point explicitly at the resolved Theia path, so the build always
uses that exact checkout. A different checkout (including git worktrees) can
be used via `--theia-path`.

## Usage

### Full Build

```sh
yarn build:local-theia                     # stable apps, dev mode
yarn build:local-theia --prod              # stable apps, prod mode
yarn build:local-theia --apps next         # electron-next, dev mode
yarn build:local-theia --apps all --prod   # everything, prod mode
```

### Using a Different Theia Location

Theia can live anywhere; pass its path with `--theia-path`. This also works with
git worktrees, since the packages are symlinked at the exact path you provide:

```sh
yarn build:local-theia --theia-path /path/to/theia
```

### Incremental Development

After the initial build, you can iterate faster:

```sh
# Rebuild only Theia IDE (framework unchanged)
yarn build:local-theia --skip-theia-build

# Rebuild only Theia packages, then rebuild the IDE apps
cd theia && npm run compile
cd .. && yarn build:local-theia --skip-theia-build --skip-plugins
```

### Build and Package

To create a distributable application:

```sh
yarn build:local-theia --package                     # packages the stable apps
yarn build:local-theia --apps next --package         # packages electron-next
```

The packaged applications will be in `applications/*/dist/`.

### Set Up Links Only

If you want to manage builds manually:

```sh
yarn build:local-theia --skip-theia-build --skip-ide-build
```

### Skip Plugin Download

If you already have plugins or want to skip downloading them:

```sh
yarn build:local-theia --skip-plugins
```

### Restore Normal Dependencies

When you're done testing with the submodule-linked framework:

```sh
yarn build:local-theia --unlink
```

This removes the `@theia/*` symlinks and reinstalls packages from npm.

### Dry Run

Preview what commands will be executed:

```sh
yarn build:local-theia --dry-run
```

## Running the Theia IDE

After building:

```sh
yarn --cwd applications/browser start       # stable browser app
yarn --cwd applications/electron start      # stable electron app
yarn --cwd applications/electron-next start # next electron app
```

If you packaged the application with `--package`, you can also run the
packaged version directly from `applications/*/dist/`.

## Development Workflow

A typical development workflow looks like:

1. **Initial setup**: Initialize the submodule and run the full build

    ```sh
    git submodule update --init theia
    yarn build:dev
    ```

2. **Make changes in Theia**: Edit files in `theia/`

3. **Rebuild the framework**:

    ```sh
    cd theia && npm run compile
    ```

4. **Rebuild and run Theia IDE**:

    ```sh
    cd ..
    yarn build:local-theia --skip-theia-build --skip-plugins
    yarn --cwd applications/browser start
    ```

5. **Commit framework changes**: Work on a branch inside `theia/`, push it to
   the fork and record the new submodule pin here:

    ```sh
    cd theia
    git checkout -b my-feature
    # ... commit changes ...
    git push origin my-feature
    cd ..
    git add theia
    ```

## Command Reference

| Option                | Description                                            |
|-----------------------|--------------------------------------------------------|
| `--theia-path <path>` | Path to the Theia checkout (default: `theia` submodule) |
| `--apps <target>`     | `stable` (browser + electron), `next` (electron-next) or `all` (default: `stable`) |
| `--prod`              | Build applications in production mode (`build:prod`)   |
| `--skip-theia-build`  | Skip building Theia packages (use if already built)    |
| `--skip-ide-build`    | Skip building the Theia IDE (use for linking only)     |
| `--skip-plugins`      | Skip downloading plugins                               |
| `--package`           | Package the selected applications after building       |
| `--unlink`            | Remove links and restore npm dependencies              |
| `--dry-run`           | Print commands without executing them                  |
| `--help`              | Show help message                                      |

## Why some dependencies are copied

When the Theia framework is installed with `npm`, some transitive dependencies end
up nested inside a package's own `node_modules` (for example
`packages/filesystem/node_modules/tar-stream`). Such a nested package may rely
on a dependency (e.g. `b4a`) that is not installed anywhere reachable from the
framework checkout. Because the build bundler and the packager resolve modules
starting from the symlinked location, they would fail with errors like:

```text
✘ [ERROR] Could not resolve "b4a"
    ../../../theia/packages/filesystem/node_modules/tar-stream/pack.js
```

To avoid this, the script scans the linked packages for dependencies that
cannot be resolved from the checkout and copies them from the IDE's own
`node_modules` into the checkout's `node_modules`. This is generic over the
dependency name and runs during both the build and the packaging step.

## Troubleshooting

### "Theia directory not found"

Initialize the submodule:

```sh
git submodule update --init theia   # or: yarn theia:init
```

Or specify a custom checkout path:

```sh
yarn build:local-theia --theia-path /correct/path/to/theia
```

### "Package not found in local Theia"

Some `@theia/*` packages used by the Theia IDE may not exist in your Theia checkout. This can happen if:

- The submodule is checked out at an older commit that doesn't have newer packages
- The package is from a different source

The script will warn about missing packages but continue with available ones.
If the commit is simply missing from the fork, sync it from upstream
(see [Syncing the Fork with Upstream](#syncing-the-fork-with-upstream)).

### Version mismatch warning

The framework checkout belongs to a different release line than the IDE's
`@theia/*` dependencies. Align them:

```sh
npm view @theia/core@<ide-version> gitHead
git -C theia checkout <that commit>
git add theia
```

or update the IDE's dependency versions (`yarn update:theia <version>`) to
match a newer framework checkout.

### Build Errors After Switching Branches

If you switch branches or commits in either repository, clean and rebuild:

```sh
# In theia-ide
git clean -xfd
yarn build:dev

# Or if only Theia packages changed
cd theia && git clean -xfd && npm ci && npm run compile
cd .. && yarn build:local-theia --skip-theia-build --skip-plugins
```

### Restoring Clean State

If things get into a bad state:

```sh
# Unlink and restore npm packages
yarn build:local-theia --unlink

# Full clean rebuild
git clean -xfd
yarn && yarn build:npm:dev && yarn download:plugins
```
