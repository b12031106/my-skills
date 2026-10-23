# 既有驗證與限制

以下是 2026-10-15 在 macOS／Herdr 上的歷史實測摘要，於 2026-10-23 隨 skill 移植。
它們不是對目前所有 CLI 版本的相容性保證；執行時仍須核對實際回應與畫面。

已觀察到：

- Claude 主 session 可透過 Herdr 開具名 Claude session，並以 peer `SendMessage` 派工；對方畫面可見任務與回覆。
- 沒有 peer 工具的 Codex 主 session，可用 `agent prompt` 派工、`agent read --lines 100` 取得算術答案，並以 `/exit`、shell 提示字元、`agent_not_found`、關 pane 的順序清理。
- daemon 派生的工具 shell 可能無法由祖先鏈定位 pane。派工者提供並驗證 workspace 的錨點 fallback 曾完整跑通。
- 同一 pane 可能命中兩個祖先 PID；判斷唯一性時應按 pane ID 去重。
- `HERDR_PANE_ID` 曾指向已不存在的 pane；`pane process-info` 不帶 `--pane` 時曾回傳聚焦中的 pane。
- 啟動時 `agent_status` 曾為 `unknown`，但畫面已出現 Claude 輸入提示；短讀取可能只看到輸入區。
- agy 的啟動、派工、讀答案、`/exit` 與關 pane 曾完整跑通。

仍有限制：

- 使用者中途接手後再交回，以及長任務多輪協作，未完成實測。
- peer 路徑的完整回傳鏈未獨立確認；讀取子 session 畫面仍是可用的收結果方式。
- 原始摘要沒有足夠證據支持 Codex **作為子 session** 的完整生命週期；不要把 Codex 作為主 session 的成功當成這項驗證。
