// SessionStart hook: load the two things Claude Code cannot see on its own.
//
// 1. AGENTS.local.md - the repo's gitignored personal / machine-notes file. Claude Code does not
//    read it; this injects it when present so those rules actually apply (it is the AstraProjecta
//    equivalent of a personal preferences file).
// 2. A short reminder of the rules that get skimmed most: the nearest AGENTS.md auto-loads on edit,
//    and `npm run build` is a hard gate. The fuller orientation lives in .claude/CLAUDE.md, which
//    Claude Code auto-loads, so this stays deliberately brief and non-duplicative.
//
// Output: JSON with hookSpecificOutput.additionalContext (injected into the session context).

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

let body = '';
body += 'Reminders: (1) This repo\'s rules live in AGENTS.md files; the nearest one auto-injects when ';
body += 'you edit a file in its folder - follow it. (2) `npm run build` must pass with zero ';
body += 'warnings/errors before any change is "done" - run it yourself. (3) Never edit SillyTavern ';
body += 'core outside this repo; reach ST only through SillyTavern.getContext().';

// Inject AGENTS.local.md (gitignored personal / machine notes) if the maintainer created one.
try {
    const local = fs.readFileSync(path.join(repoRoot, 'AGENTS.local.md'), 'utf8').trim();
    if (local) {
        body += '\n\n--- AGENTS.local.md (personal / machine-specific notes; apply these too) ---\n\n' + local;
    }
} catch { /* no local notes file; that is fine */ }

process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: body,
    },
}));
