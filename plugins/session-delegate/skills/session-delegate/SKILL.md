---
name: session-delegate
description: 在 Herdr 裡另開一個有名字的 agent session（Claude Code 或 codex / agy），把任務拆出去給它做，避免主 session context 爆掉。Claude 子 session 在主 session 有 SendMessage 時用 peer 訊息派工與回報；其他情況用 herdr agent prompt 派工、agent read 收結果。收工時先結束子 session，確認後才關 pane。當使用者說「開一個 session 幫我做」「拆出去做」「派給另一個 session」「開子 session」「另開 claude 處理」「另開 codex／agy」「把這個丟給另一個 session」「收掉那個 session」時使用。
---

# session-delegate：把任務拆給另一個 session

## 什麼時候用

主 session 的 context 快滿，或任務可以獨立做，就開一個子 session 去做。子 session 做完把結果交回來。

## 執行環境與檔案位置

- 需要可連線的 Herdr server、PATH 中的 `herdr`、Python 3 與 `ps`，以及要啟動的 `claude`、`codex` 或 `agy` CLI。安裝本 skill 不會安裝這些工具。
- `<skill-dir>` 是**本次載入的 `SKILL.md` 所在目錄**，不是工作目錄。從載入路徑取得絕對位置，所有 helper 都相對於這個目錄；不要寫死使用者家目錄、workbench 或 plugin cache 路徑。
- Marketplace 與 `npx skills add` 使用同一份內容；後者只安裝 skill，不會提供 Claude peer 訊息工具。依實際工具選擇第 1 步通道。

## 第 0 步：找出自己的 pane（先掃程序樹，不信環境變數）

環境變數 `HERDR_PANE_ID` 可能過期（實測：Codex app-server daemon 長駐，帶著已關閉 workspace 的舊值，工具 shell 會繼承）。所以**不以環境變數為唯一依據**。

**1. 掃程序樹（主要方法）**：拿自己的祖先 PID，去比對每個 pane 的前景程序與 shell PID。

```bash
python3 -I "<skill-dir>/find_self.py"
```

（`find_self.py` 與本檔同目錄，只做唯讀查詢：列 workspace → 列 pane → 每個 pane 跑 `pane process-info --pane <id>` → 比對祖先鏈。）

- **按 pane ID 去重後恰好命中一個 pane** → 那就是自己的 pane（同一 pane 可能命中多個祖先 PID）。
- **零個或多個** → 自己的 pane 無法確認，改由第 1 步的「錨點」規則處理。不要挑一個、不要用 focused pane、不要用 cwd 猜。

**2. 交叉驗證（有 `HERDR_PANE_ID` 時才做）**：`herdr pane get "<該 ID>"` 查得到，而且 `process-info --pane <該 ID>` 包含同一個祖先 PID，才算一致。不一致時以第 1 步為準，並告訴使用者環境變數與程序樹不一致。

**注意**：
- **每次呼叫 `pane process-info` 都要帶 `--pane`**。不帶時它回傳的是「目前聚焦的 pane」（實測：設了未聚焦的 `HERDR_PANE_ID` 也沒用），不是自己的 pane。
- **Codex 工具 shell 的限制（實測）**：daemon 派生的工具 shell，祖先鏈走不到 Codex 所在的 pane，所以掃不到。這種情況改用第 1 步的派工者指定錨點，不必停下來問。
- 「能不能查到自己」取代了舊的 `HERDR_ENV=1` 門檻。實測：`env -i PATH=… HOME=… herdr …` 仍能連上預設 socket（`~/.config/herdr/herdr.sock`）。

## 第 1 步：決定派工通道

先看這個 session 有沒有 `ListAgents` 與 `SendMessage` 工具：

| 條件 | 子 session 類型 | 派工 | 收結果 |
|---|---|---|---|
| 有 `SendMessage`，且子 session 是 Claude | Claude | `SendMessage(to: <name>)` | 子 session 用 `SendMessage` 回報 |
| 其他（沒有 peer 工具，或子 session 是 codex / agy） | 任一 | `herdr agent prompt <pane_id> "<任務>" --wait --timeout 120000` | `herdr agent read <pane_id> --source recent-unwrapped --lines 100` |

實測：沒有 `ListAgents`／`SendMessage` 的 codex 主 session，用上面第二列完整跑通過一次（`999+888` → 讀到 `1887`）。這一列是實測過的。

派工前先查名字有沒有撞到：`herdr agent list`。

## 啟動指令（yolo 模式，寫死，不依賴使用者的 alias）

| 工具 | 啟動指令 |
|---|---|
| Claude Code | `claude --dangerously-skip-permissions --enable-auto-mode --name <name>` |
| codex | `codex --dangerously-bypass-approvals-and-sandbox` |
| agy | `agy --dangerously-skip-permissions` |

`<name>` 規則：小寫英文加連字號，帶用途，例如 `review-pr-123`。

## 流程

### 1. 開新 pane（不搶焦點、同目錄）

```bash
herdr pane split <錨點 pane_id> --direction right --cwd "$PWD" --no-focus
```

**錨點選擇（依序）**：
1. 第 0 步找到的自己的 pane。
2. 第 0 步失敗時，用派工者在派工訊息裡指定的 pane ID。驗證：`herdr pane get <id>` 查得到，而且 `workspace_id` 與派工者指定的 workspace 相同。驗證失敗就停止，回報給派工者。
3. 都沒有 → 停止。

錨點只用來決定「在哪個 workspace 切 pane」，目的是讓子 session 與派工者同 workspace。**不用 `--current`，也不用環境變數**。從 `.result.pane.pane_id` 取得新 pane ID。**之後所有操作都用新 pane 的 ID**，不用名字。

### 2. 在新 pane 啟動子 session

```bash
herdr pane run <pane_id> "claude --dangerously-skip-permissions --enable-auto-mode --name <name>"
```

**就緒確認**（不要直接認定成功或失敗）：

```bash
herdr pane read <pane_id> --source recent-unwrapped --lines 30
herdr agent get <pane_id>
```

- 畫面出現 Claude 的輸入提示（例如 `❯`）就算就緒，即使 `agent_status` 還是 `unknown`。
- `idle` 只有在 `agent_status` 真的顯示 `idle` 時才能說已確認。
- 幾十秒內畫面沒有提示，就停下來讀畫面，告訴使用者現況，不要硬送任務。

### 3. 派工

- **Claude + peer 工具**：`SendMessage(to: "<name>", message: ...)`。訊息要自給自足（目標、工作目錄、交付方式、要回報什麼），子 session 看不到主 session 的 context。
- **其他**：`herdr agent prompt <pane_id> "<任務>" --wait --timeout 120000`。
  - `--wait` 等到狀態穩定，但**狀態不代表答案已經出來**。要以讀到的內容為準。

### 4. 收結果

```bash
herdr agent read <pane_id> --source recent-unwrapped --lines 100
```

- 讀到完整答案就用它。
- **讀不到答案**（只看到輸入區、或答案被截掉）：把 `--lines` 加到 300 再讀；還是不夠，就請子 session 把結果寫成 Markdown 檔，回報路徑，再讀檔。
- `idle`、`done` 不能代替「已經拿到答案」。

### 5. 交給使用者接手（可選）

告訴使用者 pane ID、session 名字、啟動指令。接手期間主 session 不要再派工，避免兩邊同時打字。

### 6. 收工（依使用者授權）

子 session 做完、結果已拿回來、**使用者同意**後才收工，因為會結束 session。若使用者已在本次任務明確授權做完後清理，不必重問；若要求保留或接手，就保留。未取得收工授權時先詢問。

```bash
herdr agent get <pane_id>                    # 確認是哪個 session（不要猜）
herdr agent prompt <pane_id> "/exit"         # Claude：正常結束
herdr pane read <pane_id> --source recent-unwrapped --lines 8   # 確認回到 shell 提示字元
herdr agent get <pane_id>                    # 預期：exit 1，error.code = agent_not_found
herdr pane close <pane_id>                   # 只有在上面確認「只剩 shell」之後才關
```

- `agent_not_found` 在「已看到 shell 提示字元」的前提下，是**預期的成功證據**，代表 agent 已經結束。
- codex / agy 的結束：`/exit` 已實測可用（2026-10-15），之後依第 6 步同樣的確認方式（回到 shell 提示字元、`agent_not_found`）。若 `/exit` 無效，再用 `herdr pane send-keys <pane_id> ctrl+c`，並看畫面確認。

## 錯誤處理

- **Herdr CLI 的非零結束碼要看 stderr 的 JSON**（`error.code`），不要吞掉。
- 無參數執行 `herdr agent`、`herdr pane` 只會印出 help，exit code 是 2。**這是語法提示，不是任務失敗，也不要拿來當探測手段**。
- `pane_not_found`、`agent_not_found` 要依情況判斷：收工後的 `agent_not_found` 是預期的；派工前的 `agent_not_found` 代表目標不存在。

## 安全規則

- **只操作自己這次開的 pane 與 session**。pane ID 必須來自這次的回應或第 0 步的驗證。
- 不用 `herdr workspace close`，不用 `herdr server stop`。
- 關 pane 前一定要確認「只剩 shell、沒有 agent」。
- 收工必須有使用者授權；已明確授權的清理不重問，要求保留時不清理。
- `--dangerously-*` 是 yolo 模式，子 session 不會再問權限。只派使用者明確授權的任務，不要派會對外發送訊息或改動別人資源的事。

## 參考

- [既有驗證與限制](references/verification.md)：需要區分已實測流程與尚未驗證情境時才讀。
