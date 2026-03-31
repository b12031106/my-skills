---
name: pr-review-dashboard
description: >
  Fetch GitHub PR data, analyze review trends, and generate a self-contained interactive dashboard HTML.
  Use when the user says "PR 分析", "PR 趨勢", "review 分析", "PR dashboard", "分析 PR review",
  "PR 報表", "analyze PRs", "review metrics", or wants to understand PR output and code review efficiency.
allowed-tools: Bash(gh *), Bash(python3 *), Bash(git remote *), Bash(mkdir *), Bash(kill *), Bash(ls *), Write, Read, Glob
---

# PR Review Dashboard Generator

從 GitHub 抓取 PR 與 review 資料，計算工作時數（排除週末與國定假日），生成一個自包含的互動式 HTML Dashboard。

## Overview

此 skill 會執行以下流程：
1. 從 GitHub API 批次抓取 PR 基本資料（數量、行數、檔案數）
2. 抓取每個 PR 的 review 記錄（找出首次 approve 時間）
3. 計算工作時數（排除週末 + 指定國定假日）
4. 預先聚合所有報表數據
5. 生成單一 HTML Dashboard（不嵌入原始資料，只放聚合後的統計數據）

## Step 1: Determine Parameters

從使用者的輸入中取得以下參數，未指定的使用預設值：

| 參數 | 預設值 | 說明 |
|------|--------|------|
| `REPO` | 從 `git remote -v` 的 origin 推斷 | GitHub repo（`owner/repo` 格式）|
| `SINCE` | 3 個月前 (YYYY-MM-DD) | 起始日期 |
| `OUTPUT_DIR` | `./analysis` | 輸出目錄 |
| `HOLIDAYS` | 台灣國定假日 | 週末以外額外排除的日期 |
| `WORK_HOURS` | `9-18` | 上班時間範圍 |

確認 `gh` CLI 已登入且有 repo 存取權限：
```bash
gh auth status
gh api repos/{REPO} --jq '.full_name'
```

若 repo 存取失敗，提示使用者切換 GitHub 帳號（`gh auth switch`）。

## Step 2: Fetch PR Data

建立 `{OUTPUT_DIR}/fetch_pr_data.py` 並執行。腳本需包含：

### 2.1 批次抓取 PR 基本資料

使用 `gh pr list` 搭配日期範圍視窗分頁，每次最多 100 筆：

```bash
gh pr list --repo {REPO} --state all --search "created:>={SINCE}" --limit 100 \
  --json number,title,author,createdAt,mergedAt,closedAt,state,additions,deletions,changedFiles,baseRefName,headRefName,labels,reviewDecision,url
```

分頁策略：取得每批最舊 PR 的日期作為下一批的 upper bound，直到取完。

### 2.2 抓取每個 PR 的 review 記錄

對每個 PR 呼叫 REST API：
```bash
gh api repos/{REPO}/pulls/{PR_NUMBER}/reviews --paginate
```

從 reviews 中擷取：
- `first_review_at`：最早的非 PENDING review 時間
- `first_approve_at`：最早的 APPROVED review 時間
- `time_to_first_approve_hours`：牆鐘時數（`first_approve_at - created_at`）
- `reviewers`：所有 reviewer 列表
- `approve_count`, `changes_requested_count`, `comment_count`

### 2.3 儲存

每筆 PR 存為一行 JSON，寫入 `{OUTPUT_DIR}/pr_data.jsonl`。

每筆記錄必須包含以下欄位：
```
number, title, author, state, created_at, merged_at, closed_at,
additions, deletions, changed_files, total_lines,
base_ref, head_ref, labels, review_decision, url,
first_review_at, first_approve_at, time_to_first_approve_hours,
total_reviews, approve_count, changes_requested_count, comment_count, reviewers
```

同時輸出一份 `{OUTPUT_DIR}/pr_data.csv` 方便用試算表打開。

### Rate Limiting

- 每 20 筆 PR review 請求後 sleep 1 秒
- API 失敗時 retry 最多 3 次，間隔遞增

## Step 3: Enrich with Business Hours

建立 `{OUTPUT_DIR}/enrich_data.py` 並執行。為每筆 PR 新增：

### 3.1 工作時數計算邏輯

```python
def business_hours_between(start, end, work_start=9, work_end=18):
    """
    計算兩個時間點之間的工作時數。
    - 只計算週一到週五
    - 只計算 work_start ~ work_end 時段
    - 排除 HOLIDAYS 集合中的日期
    - 時區轉換為 UTC+8（台灣時間）
    """
```

### 3.2 新增欄位

| 欄位 | 說明 |
|------|------|
| `biz_hours_to_approve` | 建立→首次 approve 的工作時數 |
| `biz_hours_to_first_review` | 建立→首次 review 的工作時數 |
| `human_reviewers` | 非 bot 的 reviewer 列表 |
| `bot_reviewers` | bot reviewer 列表（`endswith('[bot]')`）|
| `has_bot_review` | 是否有 bot 參與 review |

### 3.3 假日清單

根據使用者指定的國家/年份提供假日。預設為台灣，需涵蓋資料期間的所有假日。
若使用者未指定，用以下方式判斷：
- 詢問使用者所在地區
- 或從 repo 語言/時區推斷

更新回 `{OUTPUT_DIR}/pr_data.jsonl`。

## Step 4: Build Aggregated Dashboard

建立 `{OUTPUT_DIR}/build_dashboard.py` 並執行。

### 4.1 聚合策略

**重要**：Dashboard HTML 中只嵌入聚合後的統計數據，不嵌入原始 PR 記錄。

需要預先計算的聚合資料（分 `all` 和 `no_bot` 兩個 variant）：

```python
aggregated = {
    "all": { ... },      # 包含 bot PR 作者
    "no_bot": { ... },   # 排除 bot PR 作者（author 以 'app/' 開頭）
}
```

每個 variant 包含：

#### 時間序列（weekly + monthly）
每個時段計算：
- `count`, `authors`（獨立作者數）, `merged`
- `med_add`, `med_del`, `med_files`（中位數）
- `tot_add`, `tot_del`（合計）
- `wall_med`, `wall_p75`, `wall_p90`, `wall_avg`（牆鐘 review 時間）
- `biz_med`, `biz_p75`, `biz_p90`, `biz_avg`（工作時數 review 時間）
- `approved`（有 approve 的 PR 數）
- `bot_human`, `bot_only`, `human_only`, `no_review`（review 覆蓋分類）

#### 貢獻者排名
- `author_by_pr`: 按 PR 數量排序
- `author_by_lines`: 按行數排序
- `reviewer_by_pr`: 按審查 PR 數排序，標記 `is_bot`
- `reviewer_by_lines`: 按審查行數排序，標記 `is_bot`

#### Reviewer 時間軸
Top 12 reviewer 在每個時段的 review PR 數，用於堆疊長條圖。

#### KPI & 趨勢
- 整體數據：total, authors, merged, wall_med, biz_med, approved, bot_reviewed
- 月份趨勢：最新月份 vs 上月的 PR 數變化%、review 時間變化%

#### 觀察文字（insights）
自動生成 5-7 條關鍵觀察，包含：
- PR 數量月增率
- Review 時間變化（工作時數）
- P90 長尾改善情況
- Bot review 覆蓋率變化
- 最活躍 reviewer（bot 用紫色標記）
- Merged 率

### 4.2 HTML 模板

Dashboard 為**單一自包含 HTML 檔**，使用 Chart.js CDN。

#### 版面規範

- **單欄排版**：所有圖表全寬，不做雙欄並排
- **充裕高度**：時間序列圖至少 380px，水平條圖依人數動態計算（每人 36px + 60px padding，最低 400px）
- **深色主題**：背景 `#0f1117`，卡片 `#1a1d27`
- **不嵌入原始資料**：只嵌入聚合 JSON（通常 < 30KB）
- **不顯示 PR 明細表格**：Dashboard 只呈現報表圖表

#### 互動篩選器

| 篩選 | 選項 | 預設 |
|------|------|------|
| 時間粒度 | 週 / 月 | 週 |
| 排除 bot PR | 是 / 否 | 是 |
| Review 時間 | 工作時數 / 牆鐘 | 工作時數 |

#### 報表內容（依序）

1. **KPI 卡片**：PR 總數、活躍貢獻者、已 Merged、Review 中位數、Approve 率、Bot Review PR 數
2. **關鍵觀察**：自動生成的文字 insights
3. **PR 產出分析**（section header）
   - PR 建立數量趨勢（bar + 作者數 line，雙 Y 軸）
   - PR 量體中位數趨勢（新增/刪除行 line + 檔案數 line，雙 Y 軸）
   - PR 總產出量體（堆疊 bar：合計新增 + 合計刪除）
   - PR 作者貢獻 — PR 數量（水平 bar）
   - PR 作者貢獻 — 行數（水平 bar）
4. **Code Review 分析**（section header）
   - Code Review 時間趨勢（中位數 solid + P75 dashed + P90 dotted，標註時間模式）
   - Review Approve 率（bar，顏色依比例：≥50% 綠、≥30% 橙、<30% 紅）
   - Bot vs Human Review 覆蓋率（堆疊 bar：Bot+Human / 只有Bot / 只有Human / 無review）
5. **Reviewer 貢獻分析**（section header）
   - Reviewer 審查 PR 數量（水平 bar，紫色=Bot、青色=Human）
   - Reviewer 審查行數（水平 bar，同上配色）
   - Reviewer 活動時間軸（堆疊 bar，Top 12 reviewer）

#### 數據注入

Python build script 將聚合 JSON 注入 HTML 模板中的 placeholder：
```javascript
const D = __AGGREGATED_DATA__;
```

### 4.3 輸出

最終 HTML 寫入 `{OUTPUT_DIR}/pr-dashboard.html`。

## Step 5: Verify & Report

1. 用 `python3 -m http.server` 啟動本地 server
2. 在瀏覽器中打開 Dashboard 確認渲染正常
3. 輸出摘要報告：

```
PR Review Dashboard 產出完成：

📊 資料範圍：{SINCE} ~ {TODAY}
📋 PR 總數：{N} 筆（{M} 位作者）
📁 檔案位置：
  - Dashboard：{OUTPUT_DIR}/pr-dashboard.html（{SIZE}KB，可直接分享）
  - 原始資料：{OUTPUT_DIR}/pr_data.jsonl / pr_data.csv
  - 建置腳本：{OUTPUT_DIR}/build_dashboard.py（可重跑更新）

💡 重新產生：python3 {OUTPUT_DIR}/build_dashboard.py
```

## Do / Don't

- Do: 使用 `gh` CLI 而非直接呼叫 REST API（利用內建 auth 和 pagination）
- Do: 對大量 PR 分批抓取，避免 502/504 timeout
- Do: review 時間計算要扣除週末與國定假日
- Do: Dashboard 只嵌入聚合數據，保持 HTML 輕量（< 100KB）
- Do: 水平條圖高度依人數動態調整，確保每個名字清楚可讀
- Do: Bot reviewer 用紫色、Human 用青色做視覺區分
- Don't: 在 HTML 中嵌入原始 PR 記錄
- Don't: 用雙欄排版擠壓圖表
- Don't: 忘記處理 GitHub API rate limiting
- Don't: 假設所有 PR 都有 review（很多可能沒有）
