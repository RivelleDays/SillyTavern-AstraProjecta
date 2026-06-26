// PreToolUse hook (Edit|Write): when you edit a file, find the NEAREST AGENTS.md by walking up
// from the file's folder toward the repo root, and inject that doc into context BEFORE the edit
// lands. AstraProjecta keeps ~55 nested AGENTS.md files (one per folder with stable rules), and
// Claude Code does not read them on its own. This makes the right one load automatically, so a
// feature folder's rules are in context before its code gets touched.
//
// Each AGENTS.md is injected at most once per session (marker keyed by session_id + its path), so
// repeated edits in the same folder don't re-inject. The repo-root AGENTS.md is intentionally
// skipped here: it is surfaced at session start and is too large to dump on every edit. This hook
// is for the small, highly relevant nested docs.
//
// Input: PreToolUse JSON on stdin ({ tool_input: { file_path }, session_id }).
// Output: nothing => proceed normally. On a match, additionalContext carrying the nearest doc.

const fs = require('fs');
const path = require('path');
const os = require('os');

const repoRoot = path.resolve(__dirname, '..', '..');

let data = '';
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
    let payload;
    try { payload = JSON.parse(data); } catch { return; }
    let fp = ((payload.tool_input || {}).file_path || '').trim();
    if (!fp) return;

    // Resolve to an absolute path; the editor may pass relative, forward-slash, or backslash paths.
    fp = path.resolve(fp);

    // Walk up from the edited file's directory toward the repo root, looking for the nearest
    // AGENTS.md. Stop AT the repo root (its AGENTS.md is handled at session start). Comparisons are
    // case-insensitive because the drive-letter case can differ between the edited path and this
    // script's location on Windows (e.g. d:\ vs D:\); the repoRoot + separator guard also stops a
    // sibling folder like <repo>-backup from matching.
    const repoRootLc = repoRoot.toLowerCase();
    const insidePrefix = repoRootLc + path.sep.toLowerCase();
    let dir = path.dirname(fp);
    let found = null;
    while (true) {
        const dirLc = dir.toLowerCase();
        if (dirLc === repoRootLc) break;            // reached the repo root: stop
        if (!dirLc.startsWith(insidePrefix)) break; // path is outside the repo: stop
        const candidate = path.join(dir, 'AGENTS.md');
        if (fs.existsSync(candidate)) { found = candidate; break; }
        const parent = path.dirname(dir);
        if (parent === dir) break;                  // reached a filesystem root: stop
        dir = parent;
    }
    if (!found) return;

    const rel = path.relative(repoRoot, found).replace(/\\/g, '/');

    // Inject once per session per AGENTS.md. Marker keyed by session id + sanitized doc path.
    const sid = String(payload.session_id || 'nosession').replace(/[^a-zA-Z0-9_-]/g, '');
    const key = rel.replace(/[^a-zA-Z0-9_-]/g, '_');
    const markerDir = path.join(os.tmpdir(), 'astra-agents-hooks');
    const marker = path.join(markerDir, sid + '-' + key);
    try {
        if (fs.existsSync(marker)) return;
        fs.mkdirSync(markerDir, { recursive: true });
        fs.writeFileSync(marker, '1');
    } catch { /* marker is best-effort; re-injecting is harmless */ }

    let content;
    try { content = fs.readFileSync(found, 'utf8').trim(); } catch { return; }

    process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            additionalContext:
                'You are editing code governed by ' + rel + ' (the nearest AGENTS.md). Its rules are ' +
                'authoritative for this folder - honor them, do not skim. Full contents follow:\n\n' + content,
        },
    }));
});
