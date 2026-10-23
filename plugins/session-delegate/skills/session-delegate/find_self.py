import json, os, subprocess

def herdr(*args):
    out = subprocess.run(["herdr", *args], capture_output=True, text=True).stdout
    return json.loads(out)["result"] if out.strip() else {}

# ancestry of this process (pids)
anc, p = set(), os.getpid()
while p > 1:
    anc.add(p)
    ppid = subprocess.run(["ps", "-o", "ppid=", "-p", str(p)], capture_output=True, text=True).stdout.strip()
    if not ppid:
        break
    p = int(ppid)

hits, scanned = [], 0
for ws in herdr("workspace", "list")["workspaces"]:
    for pane in herdr("pane", "list", "--workspace", ws["workspace_id"])["panes"]:
        pid_ = pane["pane_id"]
        scanned += 1
        pi = herdr("pane", "process-info", "--pane", pid_).get("process_info", {})
        pids = [pi.get("shell_pid")] + [x["pid"] for x in pi.get("foreground_processes", [])]
        for pid in pids:
            if pid in anc:
                hits.append((pid_, pid))
print("ancestors:", sorted(anc))
print("panes scanned:", scanned)
print("hits:", hits)
