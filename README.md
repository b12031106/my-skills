# my-skills

Personal agent skills，支援 Claude Code marketplace 與 `npx skills add` 安裝；兩種方式共用 `plugins/*/skills/` 下的同一份內容。

## 安裝方式

### 方法一：Claude Code 內建指令

```
/plugin marketplace add b12031106/my-skills
/plugin install session-delegate@my-skills
```

先註冊 marketplace，再選擇要安裝的 plugin；只註冊 marketplace 不會安裝所有 skills。
已註冊者先執行 `/plugin marketplace update my-skills`；已安裝的 plugin 可用 `/plugin update session-delegate@my-skills` 更新。

### 方法二：npx skills add（Claude Code、Codex 等 agent）

```bash
# 列出 repo 中可安裝的 skills
npx skills add b12031106/my-skills --list

# 安裝到目前專案，明確選擇 skill 與 agent
npx skills add b12031106/my-skills --skill session-delegate -a claude-code codex

# 加上 -g 可安裝到使用者層，供所有專案使用
npx skills add b12031106/my-skills --skill session-delegate -a claude-code codex -g
```

省略 `--skill` 可互動選擇 repo 中其他 skills。`npx skills add` 安裝 skill 本身，
不會註冊 Claude marketplace 或安裝 plugin 的其他元件；同一 agent 請擇一安裝方式，避免重複載入。

Claude Code marketplace 呼叫名稱是 `/session-delegate:session-delegate`；
直接安裝 skill 後，Claude Code 用 `/session-delegate`，Codex 用 `$session-delegate`。

### 方法三：既有 my-skills CLI

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

### session-delegate

| Skill | 說明 | 觸發方式 |
|-------|------|----------|
| [session-delegate](plugins/session-delegate/skills/session-delegate/SKILL.md) | 在 Herdr 開具名 Claude Code／Codex／agy session、派工、收結果，依授權收工 | 「開一個 session 幫我做」、「另開 claude 處理」、「收掉那個 session」 |

執行環境需要可連線的 Herdr server、`herdr`、Python 3、`ps`，以及選定的 agent CLI。
Skill 保留原本的 `--dangerously-*` 啟動方式；只派明確授權的任務。
安裝不會啟動子 session 或安裝這些執行工具。既有驗證範圍見 [驗證紀錄](plugins/session-delegate/skills/session-delegate/references/verification.md)。

### git-workflow

| Skill | 說明 | 觸發方式 |
|-------|------|----------|
| commit-and-push | 自動 commit 所有變更並推送到 remote | 「幫我 commit」、「push my changes」、「推上去」 |

### retro-games

| Skill | 說明 | 觸發方式 |
|-------|------|----------|
| retro-web-port | 原版證據式 Web 移植；自主子代理分工、debug／god mode 局部與通關流程驗收、最後依需求正常遊玩及 TODO 交接 | `/retro-games:retro-web-port` |

Claude Code 安裝與呼叫：

```text
/plugin marketplace add b12031106/my-skills
/plugin install retro-games@my-skills
/retro-games:retro-web-port 接續目前專案，自主推進原版遊戲的 Web 移植加強版。
```

已加入 marketplace 的使用者可先用 `/plugin marketplace update my-skills` 更新清單。不要為此安裝其他不需要的 plugins。

Codex 可用 `npx skills add b12031106/my-skills --skill retro-web-port -a codex` 安裝，再以 `$retro-web-port` 呼叫。Claude Code 個人 skill 則將 agent 改成 `claude-code`，以 `/retro-web-port` 呼叫。

共用流程不依賴單一模型廠商；[跨 agent 適配](plugins/retro-games/skills/retro-web-port/references/agent-compatibility.md) 說明如何使用本地模型與子代理工具。Skill 本身不提供 Goal、背景執行或自動排程。已做格式與檔案結構檢查，Claude Code 實際移植流程尚未驗收。

使用本 skill 推進開發時，已明確授權 agent 自行擔任主控、喚起與派遣子代理，並依分工表選擇模型與思考等級；不必逐次確認。這不包含創建獨立使用者 session 或外部付費／擴權操作。既有安裝需更新 marketplace 與 `retro-games` plugin 才能取得最新規則。

流程通關優先使用隔離的 debug／god mode、鎖血、加強隊員、補資金／物品或調整測試價格，實際觸發勝敗、事件、跨關與結局，避免困在正常難度。直接寫通關旗標不能代替這種驗收。先排除流程障礙，正常數值／難度遊玩最後依需求安排；兩種結果分開記錄。

可獨立驗證的低／中風險子任務先試較省成本模型（Claude：Haiku → Sonnet → Opus；Codex：Luna → Sol → Astra），未知逆向與高影響共用狀態可跳級。主控依真正交付在專案 `docs/MODEL-ROUTING.md` 記錄適用條件與結果，校正後续路由；每次派發明定測試範圍，避免代理自行跑長時間整套驗收。兩家梯度是角色配置，非能力或價格等價保證。

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

3. 在 `.claude-plugin/marketplace.json` 的 `plugins` 陣列中註冊新 plugin，並列出相對於 plugin 根目錄的 skill 路徑：

```json
{
  "name": "<plugin-name>",
  "source": "./plugins/<plugin-name>",
  "skills": ["./skills/<skill-name>"]
}
```

`npx skills add` 會讀取這份 manifest，不需要另建一份根目錄 `skills/` 或複製內容。
Helper 與參考檔都放在各自 skill 目錄內，路徑以 `SKILL.md` 為基準，確保兩種安裝都能帶走完整內容。

4. 驗證 manifest 與 skill 探索：

```bash
claude plugin validate .
claude plugin validate ./plugins/<plugin-name>
npx skills add . --list
```

5. Push 到 GitHub 後，使用者再從遠端安裝或更新。

格式依據：[Claude marketplace 文件](https://code.claude.com/docs/en/plugin-marketplaces)、[skills CLI 的 manifest 探索規則](https://github.com/vercel-labs/skills/blob/main/docs/creating-skills.md#plugin-manifest-discovery)。

## License

MIT
