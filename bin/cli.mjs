#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createInterface } from "node:readline";

const CLAUDE_DIR = join(homedir(), ".claude");
const PLUGINS_DIR = join(CLAUDE_DIR, "plugins");
const MARKETPLACES_DIR = join(PLUGINS_DIR, "marketplaces");
const CACHE_DIR = join(PLUGINS_DIR, "cache");
const KNOWN_MARKETPLACES_PATH = join(PLUGINS_DIR, "known_marketplaces.json");
const INSTALLED_PLUGINS_PATH = join(PLUGINS_DIR, "installed_plugins.json");

// --- Helpers ---

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeJson(path, data) {
  ensureDir(join(path, ".."));
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

function getKnownMarketplaces() {
  return readJson(KNOWN_MARKETPLACES_PATH) || {};
}

function getInstalledPlugins() {
  return readJson(INSTALLED_PLUGINS_PATH) || { version: 2, plugins: {} };
}

function getGitCommitSha(dir) {
  try {
    return execSync("git rev-parse HEAD", { cwd: dir, encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

// --- Interactive selection ---

async function interactiveSelect(plugins) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

  console.log("\nAvailable plugins:");
  plugins.forEach((p, i) => {
    console.log(`  [${i + 1}] ${p.name} - ${p.description}`);
  });
  console.log();

  const answer = await ask(
    "Enter plugin numbers to install (comma-separated, or 'all'): "
  );
  rl.close();

  if (answer.trim().toLowerCase() === "all") return plugins;

  const indices = answer
    .split(",")
    .map((s) => parseInt(s.trim(), 10) - 1)
    .filter((i) => i >= 0 && i < plugins.length);

  return indices.map((i) => plugins[i]);
}

// --- Commands ---

async function cmdAdd(ownerRepo, flags) {
  const installAll = flags.includes("--all");
  const parts = ownerRepo.split("/");
  if (parts.length !== 2) {
    console.error("Error: format should be owner/repo");
    process.exit(1);
  }
  const [owner, repo] = parts;
  const marketplaceName = repo;
  const installDir = join(MARKETPLACES_DIR, marketplaceName);

  // Clone or update
  ensureDir(MARKETPLACES_DIR);
  if (existsSync(installDir)) {
    console.log(`Updating existing marketplace: ${marketplaceName}...`);
    try {
      execSync("git pull --ff-only", { cwd: installDir, stdio: "inherit" });
    } catch {
      console.log("Pull failed, re-cloning...");
      rmSync(installDir, { recursive: true, force: true });
      execSync(`git clone https://github.com/${ownerRepo}.git ${installDir}`, {
        stdio: "inherit",
      });
    }
  } else {
    console.log(`Cloning marketplace: ${ownerRepo}...`);
    execSync(`git clone https://github.com/${ownerRepo}.git ${installDir}`, {
      stdio: "inherit",
    });
  }

  // Read marketplace.json
  const marketplaceJsonPath = join(installDir, ".claude-plugin", "marketplace.json");
  if (!existsSync(marketplaceJsonPath)) {
    console.error("Error: .claude-plugin/marketplace.json not found in the repo");
    process.exit(1);
  }
  const marketplace = readJson(marketplaceJsonPath);
  const plugins = marketplace.plugins || [];

  if (plugins.length === 0) {
    console.log("No plugins found in this marketplace.");
    return;
  }

  // Select plugins
  let selected;
  if (installAll) {
    selected = plugins;
    console.log(`\nInstalling all ${selected.length} plugin(s)...`);
  } else {
    selected = await interactiveSelect(plugins);
    if (selected.length === 0) {
      console.log("No plugins selected.");
      return;
    }
  }

  // Update known_marketplaces.json
  const known = getKnownMarketplaces();
  known[marketplaceName] = {
    source: { source: "github", repo: ownerRepo },
    installLocation: installDir,
    lastUpdated: new Date().toISOString(),
  };
  writeJson(KNOWN_MARKETPLACES_PATH, known);

  // Update installed_plugins.json
  const installed = getInstalledPlugins();
  const sha = getGitCommitSha(installDir);

  for (const plugin of selected) {
    const key = `${plugin.name}@${marketplaceName}`;
    const pluginSource = join(installDir, plugin.source || ".");
    const version = readJson(join(pluginSource, ".claude-plugin", "plugin.json"))?.version || sha.slice(0, 12);
    const cachePath = join(CACHE_DIR, marketplaceName, plugin.name, version);

    // Copy plugin to cache
    ensureDir(cachePath);
    const sourceDir = join(installDir, plugin.source || ".");
    execSync(`cp -r "${sourceDir}/." "${cachePath}/"`, { stdio: "pipe" });

    installed.plugins[key] = [
      {
        scope: "user",
        installPath: cachePath,
        version,
        installedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        gitCommitSha: sha,
      },
    ];
    console.log(`  Installed: ${plugin.name} (${version})`);
  }

  writeJson(INSTALLED_PLUGINS_PATH, installed);
  console.log("\nDone! Installed plugins are now available in Claude Code.");
}

function cmdList() {
  const known = getKnownMarketplaces();
  const installed = getInstalledPlugins();

  const marketplaceNames = Object.keys(known);
  if (marketplaceNames.length === 0) {
    console.log("No marketplaces registered.");
    return;
  }

  console.log("Registered marketplaces:\n");
  for (const name of marketplaceNames) {
    const m = known[name];
    console.log(`  ${name} (${m.source.repo})`);
    console.log(`    Location: ${m.installLocation}`);
    console.log(`    Updated:  ${m.lastUpdated}`);

    // List installed plugins from this marketplace
    const pluginKeys = Object.keys(installed.plugins || {}).filter((k) =>
      k.endsWith(`@${name}`)
    );
    if (pluginKeys.length > 0) {
      console.log("    Plugins:");
      for (const key of pluginKeys) {
        const pluginName = key.split("@")[0];
        const info = installed.plugins[key]?.[0];
        console.log(`      - ${pluginName} v${info?.version || "?"}`);
      }
    }
    console.log();
  }
}

function cmdRemove(marketplaceName) {
  if (!marketplaceName) {
    console.error("Error: specify marketplace name to remove");
    process.exit(1);
  }

  const known = getKnownMarketplaces();
  if (!known[marketplaceName]) {
    console.error(`Marketplace "${marketplaceName}" not found.`);
    process.exit(1);
  }

  // Remove from known_marketplaces
  const installDir = known[marketplaceName].installLocation;
  delete known[marketplaceName];
  writeJson(KNOWN_MARKETPLACES_PATH, known);

  // Remove related installed plugins
  const installed = getInstalledPlugins();
  const removedPlugins = [];
  for (const key of Object.keys(installed.plugins || {})) {
    if (key.endsWith(`@${marketplaceName}`)) {
      // Remove cache
      const cachePath = installed.plugins[key]?.[0]?.installPath;
      if (cachePath && existsSync(cachePath)) {
        rmSync(cachePath, { recursive: true, force: true });
      }
      delete installed.plugins[key];
      removedPlugins.push(key.split("@")[0]);
    }
  }
  writeJson(INSTALLED_PLUGINS_PATH, installed);

  // Remove cloned marketplace dir
  if (existsSync(installDir)) {
    rmSync(installDir, { recursive: true, force: true });
  }

  console.log(`Removed marketplace: ${marketplaceName}`);
  if (removedPlugins.length > 0) {
    console.log(`Removed plugins: ${removedPlugins.join(", ")}`);
  }
}

function showHelp() {
  console.log(`
my-skills - Personal Claude Code skills marketplace CLI

Usage:
  my-skills add <owner/repo> [--all]   Add a marketplace and install plugins
  my-skills list                        List registered marketplaces and plugins
  my-skills remove <name>               Remove a marketplace and its plugins
  my-skills help                        Show this help message
`);
}

// --- Main ---

const [, , command, ...args] = process.argv;

switch (command) {
  case "add":
    if (!args[0]) {
      console.error("Error: specify owner/repo");
      process.exit(1);
    }
    await cmdAdd(args[0], args.slice(1));
    break;
  case "list":
    cmdList();
    break;
  case "remove":
    cmdRemove(args[0]);
    break;
  case "help":
  case undefined:
    showHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
