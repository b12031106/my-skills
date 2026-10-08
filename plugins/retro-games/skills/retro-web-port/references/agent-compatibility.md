# 跨 coding agent 適配

共用的是 `SKILL.md` 與 `references/` 的方法、證據與驗收契約。模型、子代理 API、權限、專案規範和長時間執行機制依宿主調整；不得為執行 skill 改全域設定、解除權限或自動建立排程。

## Codex

- 以 `$retro-web-port` 呼叫；`agents/openai.yaml` 提供 Codex UI metadata。
- 使用本地可用的子代理工具與 orchestration.md 的 Codex 模型政策。
- Goal 需使用者明確建立或要求；它是宿主提供的持續目標，skill 本身不實作背景執行。

## Claude Code

- 個人安裝：將完整 skill 目錄放在 `~/.claude/skills/retro-web-port/`，以 `/retro-web-port` 呼叫；專案安裝可放 `.claude/skills/retro-web-port/`。
- 透過本 repository 的 `retro-games` plugin 安裝時，使用 `/retro-games:retro-web-port`。命名空間只是入口差異，不更改工作方法。
- 讀取 `CLAUDE.md` 及實際存在的其他專案規範。保留 `TODO.md` 作為專案现況入口，不替換已有規範。
- 不使用 GPT 預設表強制分派。以實際可用的 `sonnet`／`opus`／`haiku` 等模型對應角色：一般總控與有明確規則的實作使用適當的一般模型；未知逆向、共用狀態與關鍵覆核使用較強模型；簡單資料整理和固定步驟驗證可用較輕量模型。這是分工建議，不是與 GPT 型號的能力等價宣稱。
- 思考／effort 設定僅用該版本及模型實際支援的選項；不能假設 Codex 的 `medium`／`high` 可逐項直接對應。不能切換時沿用現有設定，記錄限制。
- 子代理使用可用的委派工具；每次交付明確任務與相關 skill／參考路徑，要求讀取或以宿主支援方式載入。不要假設子代理已繼承主控的對話或 skill。
- 不假設有 `/goal`，也不把 skill 當作無人值守執行器。依已授權的本地持續執行能力工作；中斷前保留 TODO 與恢復位置，等待使用者接續時明示原因。
- `agents/openai.yaml` 是 Codex 附加資料，不是 Claude 子代理定義，勿將其複製為 `.claude/agents/` 設定。

## 其他 agent

能載入 Agent Skills 的工具可使用完整目錄；不支援原生 skills 的工具可由使用者要求它讀取 `SKILL.md` 及相關參考。後者僅是指示文件的重用，不保證自動發現、快捷呼叫或子代理功能。保留同樣的完成範圍、證據、儲存隔離及主控簽核。

Claude Code 格式與能力參考：[Skills](https://code.claude.com/docs/en/skills)、[Subagents](https://code.claude.com/docs/en/sub-agents)。實際版本能力優先，尚未在某宿主試跑時不得宣稱已驗證。
