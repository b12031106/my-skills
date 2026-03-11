# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

A Claude Code plugin marketplace (`b12031106/my-skills`) that serves two purposes:
1. **Marketplace** — installable via `/plugin marketplace add b12031106/my-skills` in Claude Code
2. **CLI** — `pnpx my-skills` to automate marketplace registration and plugin installation

## Architecture

- `.claude-plugin/marketplace.json` — marketplace definition; lists all plugins and their skill paths
- `plugins/<plugin-name>/` — each plugin has its own `.claude-plugin/plugin.json` and `skills/` directory
- `bin/cli.mjs` — zero-dependency Node.js CLI (ESM); manages `~/.claude/plugins/` JSON files directly

### CLI Data Flow (`add` command)
1. `git clone` marketplace repo → `~/.claude/plugins/marketplaces/<name>/`
2. Read `.claude-plugin/marketplace.json` for plugin list
3. Copy selected plugins to `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`
4. Update `~/.claude/plugins/known_marketplaces.json` and `installed_plugins.json`

## Commands

```bash
node bin/cli.mjs add <owner/repo> [--all]   # Install marketplace + plugins
node bin/cli.mjs list                        # Show registered marketplaces
node bin/cli.mjs remove <name>               # Remove marketplace + plugins
```

## Adding a New Plugin

1. Create `plugins/<name>/.claude-plugin/plugin.json` with name, description, version, author
2. Add skill directories under `plugins/<name>/skills/<skill-name>/SKILL.md`
3. Register the plugin in `.claude-plugin/marketplace.json` under `plugins` array

## Conventions

- Zero external dependencies — CLI uses only Node.js built-ins
- ESM only (`"type": "module"` in package.json)
- GitHub repo is `b12031106/my-skills`; the gh account for this repo is `b12031106` (not `justin-hsu-kkday`)
