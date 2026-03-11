# my-skills

Personal Claude Code skills marketplace & CLI.

## 安裝方式

### 方法一：Claude Code 內建指令

```
/plugin marketplace add b12031106/my-skills
```

### 方法二：CLI

```bash
pnpx my-skills add b12031106/my-skills --all
```

## CLI 使用

```bash
my-skills add <owner/repo> [--all]   # 新增 marketplace 並安裝 plugins
my-skills list                        # 列出已註冊的 marketplaces 和 plugins
my-skills remove <name>               # 移除 marketplace 及其 plugins
```

不加 `--all` 時會進入互動選單，讓你選擇要安裝哪些 plugins。

## 目前收錄的 Skills

### git-workflow

| Skill | 說明 | 觸發方式 |
|-------|------|----------|
| commit-and-push | 自動 commit 所有變更並推送到 remote | 「幫我 commit」、「push my changes」、「推上去」 |

## 新增自己的 Skill

1. 在 `plugins/` 下建立 plugin 目錄：

```
plugins/<plugin-name>/
├── .claude-plugin/
│   └── plugin.json
└── skills/
    └── <skill-name>/
        └── SKILL.md
```

2. 編輯 `plugin.json`：

```json
{
  "name": "<plugin-name>",
  "description": "...",
  "version": "1.0.0",
  "author": { "name": "Your Name" }
}
```

3. 在 `.claude-plugin/marketplace.json` 的 `plugins` 陣列中註冊新 plugin。

4. Push 到 GitHub 後重新安裝即可生效。

## License

MIT
