// PreToolUse hook (Bash, gated to `git commit` via the settings.json `if` filter): inject
// AstraProjecta's pre-commit checklist as a reminder right before a commit runs. This does NOT
// block - it nudges - matching the repo's documented commit discipline (build must pass, single-
// topic message, scope reviewed, no unauthorized push/merge).
//
// To turn it into a hard gate instead of a reminder, set permissionDecision: 'ask' (prompts the
// user) or 'deny' (blocks) inside hookSpecificOutput below, with a permissionDecisionReason.
//
// Input: PreToolUse JSON on stdin ({ tool_input: { command } }).
// Output: nothing => allow silently. On a `git commit`, additionalContext with the checklist.

let data = '';
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
    let cmd = '';
    try { cmd = (JSON.parse(data).tool_input || {}).command || ''; } catch { return; }

    // The settings.json `if` already scopes this to commits; this guard stops a stray match
    // (e.g. `git log --grep "commit"`) from ever triggering the reminder.
    if (!/\bgit\b[^\n;|&]*\bcommit\b/.test(cmd)) return;

    process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            additionalContext:
                'Pre-commit checklist (from AGENTS.md): ' +
                '(1) Did `npm run build` pass with ZERO warnings and errors? It is a hard gate. ' +
                '(2) Is this a single-topic commit with a readable conventional-style / imperative message? ' +
                '(3) Reviewed `git status` and `git diff --cached` - no unrelated changes sneaking in? ' +
                '(4) Push, merge, PR, and branch deletion need explicit user authorization - commit only.',
        },
    }));
});
