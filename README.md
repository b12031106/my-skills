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

### retro-games

| Skill | 說明 | 觸發方式 |
|-------|------|----------|
| retro-web-port | 原版證據式 Web 移植；起步／中途／收尾、子代理分工、測試存檔局部驗收、最後自然破關及 TODO 交接 | `/retro-games:retro-web-port` |

Claude Code 安裝與呼叫：

```text
/plugin marketplace add b12031106/my-skills
/plugin install retro-games@my-skills
/retro-games:retro-web-port 接續目前專案，自主推進原版遊戲的 Web 移植加強版。
```

已加入 marketplace 的使用者可先用 `/plugin marketplace update my-skills` 更新清單。不要為此安裝其他不需要的 plugins。

Codex 使用同一份 skill：將 `plugins/retro-games/skills/retro-web-port/` 完整目錄放入自己的 skills 目錄（通常是 `~/.codex/skills/retro-web-port/`），再以 `$retro-web-port` 呼叫。Claude Code 個人 skill 安裝則放入 `~/.claude/skills/retro-web-port/`，以 `/retro-web-port` 呼叫。

共用流程不依賴單一模型廠商；[跨 agent 適配](plugins/retro-games/skills/retro-web-port/references/agent-compatibility.md) 說明如何使用本地模型與子代理工具。Skill 本身不提供 Goal、背景執行或自動排程。已做格式與檔案結構檢查，Claude Code 實際移植流程尚未驗收。

使用本 skill 推進開發時，已明確授權 agent 自行擔任主控、喚起與派遣子代理，並依分工表選擇模型與思考等級；不必逐次確認。這不包含創建獨立使用者 session 或外部付費／擴權操作。既有安裝需更新 marketplace 與 `retro-games` plugin 才能取得最新規則。

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
