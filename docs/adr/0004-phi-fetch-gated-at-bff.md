# ADR-0004 — PHI fetch gated at BFF, not at CLI print layer

**Date:** 2026-06-22  
**Status:** Accepted

## Context

Every operator returns `TwoChannelResult<M, W>` (ADR-0003). The question was where to enforce the PHI boundary: at the BFF (don't fetch PHI unless asked) or at the CLI (always fetch, suppress at print time).

## Decision

PHI is gated at the **BFF level** via a `?includePhi=true` query parameter. Without it, bff-cli makes no PHI-bearing upstream call and returns `widgetOnly: {}`. The CLI passes `?includePhi=true` only when `--include-phi` is set.

## Rationale

**CLI-layer filtering:** Simpler — BFF always fetches both channels, CLI decides what to print. But `widgetOnly` is populated on every response, meaning any MCP tool that passes the BFF response into model context receives PHI regardless of the tool author's intent.

**BFF-conditional (chosen):** PHI is structurally absent from the response unless explicitly requested. MCP tools that omit `?includePhi=true` cannot leak PHI into model context by accident — the data was never fetched. This is the entire reason for the two-channel architecture: the guarantee must hold at the data layer, not depend on every consumer correctly filtering their output.

## Consequences

- All bff-cli routes must accept `?includePhi=true` and skip PHI-bearing upstream calls without it.
- `widgetOnly` is always `{}` in the default (no-flag) response.
- The `surveillance` route (issue 07) currently always fetches patient PHI — it must be fixed to respect `?includePhi=true`.
- MCP tool definitions (issue 12+) must be authored with `?includePhi=true` absent by default; widget-serving tools that need PHI set it explicitly.
- Architecture Conformance Checklist (issue 10) must verify every bff-cli route enforces this.
