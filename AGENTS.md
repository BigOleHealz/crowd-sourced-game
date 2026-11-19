# Project instructions

## Git workflow

- Create a separate Git worktree and a dedicated feature branch for every new feature before editing it. Use the `codex/` prefix for Codex feature branches.
- Keep each feature’s source edits, tests and local commits in its own worktree. Give independently introduced enhancements their own worktrees and branches, even when they depend on earlier features.
- Combine and test features on a separate non-main integration branch. Never edit files on `main`.
- Never push directly to `main`.
- Never merge `main` into a feature branch, including through a pull that merges `origin/main`.
- Use a pull request for any change targeting `main`.

## Rust Token Killer (RTK)

Use RTK by default for supported shell commands to reduce output tokens.
The global PreToolUse hook rewrites commands automatically. If the hook is
unavailable, explicitly use `rtk <command>` when supported (for example,
`rtk git status` or `rtk rg pattern path`). Avoid wrapping an RTK command twice.
Use raw commands or `rtk bypass <command>` when exact, complete output is
needed for correctness, machine parsing, or debugging; follow any recovery
path in condensed output. See `~/.codex/RTK.md` for details.
