---
name: commit-and-push
description: Auto-commit all uncommitted changes with an AI-generated commit message and push to remote. Use when the user says "commit and push", "push my changes", "幫我 commit", "commit 起來", "推上去", or any variation of wanting to save and push their current work.
allowed-tools: Bash(git status *), Bash(git diff *), Bash(git log *), Bash(git add *), Bash(git commit *), Bash(git push *), Bash(git rev-parse *), Bash(git branch *)
---

# Auto Commit & Push

Automatically commit all uncommitted changes and push to remote. Follow these steps exactly:

## Step 1: Check current state

Run these commands in parallel to understand the situation:
- `git status` (never use `-uall`)
- `git diff` and `git diff --staged` to see all changes
- `git log --oneline -5` to see recent commit message style

If there are no changes at all (no untracked, no modified, no staged files), tell the user there's nothing to commit and stop.

## Step 2: Stage all changes

Stage all relevant changes. Prefer `git add` with specific file paths rather than `git add -A` when practical. However, if there are many files changed across the codebase, `git add -A` is acceptable.

Important: Do NOT stage files that likely contain secrets (`.env`, `credentials.json`, `*.key`, `*.pem`, etc.). If such files exist, warn the user and skip them.

## Step 3: Generate commit message

Analyze the staged diff to write a concise, meaningful commit message:

- Follow the existing commit message style from recent history (conventional commits, imperative mood, etc.)
- Focus on the "why" not just the "what"
- Keep the first line under 72 characters
- Add a body if the changes are complex enough to warrant explanation
- Use the appropriate language matching recent commits (if recent commits are in Chinese, use Chinese; if English, use English)
- End with: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

Use a HEREDOC to pass the message:
```bash
git commit -m "$(cat <<'EOF'
<commit message here>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

## Step 4: Push to remote

After a successful commit:

1. Check if the current branch tracks a remote branch: `git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null`
2. If it tracks a remote, push with `git push`
3. If no upstream is set, push with `git push -u origin <current-branch-name>`

Never force push. If the push fails due to diverged history, inform the user and suggest they pull first.

## Step 5: Confirm

Show the user:
- The commit hash and message
- Which branch was pushed and to where
- A brief summary of what was included
