# ADR-0003 — Uniform TwoChannelResult on every operator

**Date:** 2026-06-22  
**Status:** Accepted

## Context

The `TwoChannelResult<M, W>` type separates PHI (`widgetOnly`) from model-safe data (`model`). Some operators (`growth`, `measurement`, `ifu`) have no PHI fields today. The question was whether to apply `TwoChannelResult` only where PHI exists, or uniformly on every operator.

## Decision

Every operator returns `TwoChannelResult<M, W>` without exception. `widgetOnly` is `{}` on operators with no PHI fields. The `--include-phi` flag exists on every CLI command; on commands with empty `widgetOnly` it prints `"This command has no PHI fields."` and exits cleanly.

## Rationale

**Pragmatic (only where PHI exists):** Less boilerplate. Operators with no PHI are simpler to read and test.

**Uniform (chosen):** The PHI boundary is auditable by inspection — you never need to ask "does this operator have PHI?" because the answer is always the same shape. Future operators that add PHI fields don't require a structural change, only a `widgetOnly` payload. The `--include-phi` flag on every command makes the intent explicit to anyone reading scripts or MCP tool definitions. An empty `widgetOnly` is a documented claim ("no PHI here") not dead code.

The cost — empty `widgetOnly: {}` on three operators and a no-op flag path — is low. The benefit — a uniform auditable interface — compounds as the operator count grows.

## Consequences

- All existing operators (`patient`, `study`, `growth`, `measurement`, `ifu`, `surveillance`) must return `TwoChannelResult<M, W>`.
- `growth`, `measurement`, and `ifu` get `widgetOnly: {}` and the info message path.
- MCP tool definitions follow the same shape: `structuredContent` from `model`, `_meta` from `widgetOnly`, consistently.
- Architecture Conformance Checklist (issue 10) must verify every operator conforms.
