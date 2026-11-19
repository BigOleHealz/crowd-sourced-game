# Project instructions

## Git workflow

- Develop and commit on a feature branch. Use the `codex/` prefix for Codex feature branches.
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
