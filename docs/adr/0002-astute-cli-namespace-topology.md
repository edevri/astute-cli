# ADR-0002: astute-cli namespace topology — bff-cli + web-cli on agentpool, no scale-to-zero

**Date:** 2026-06-20  
**Status:** Accepted

## Context

The agent/CLI platform requires two cluster-side services:
- `bff-cli` — data access gateway for the CLI binary and MCP server
- `web-cli` — static file server for ChatGPT Apps SDK widget HTML/JS

Four deployment questions needed resolution:

1. **Which namespace?** Reuse an existing namespace, or create `astute-cli`?
2. **Which nodepool?** `agentpool` (general compute, always warm) or `ingest` (scale-to-zero, 3+ min cold start)?
3. **Scale-to-zero?** The ingest nodepool scales to zero; viewer/pems/app do not.
4. **MCP transport?** stdio (local process), dual transport, or remote HTTP/SSE (cluster pod)?

## Decision

Create a dedicated **`astute-cli` namespace** containing `bff-cli`, `mcp-cli`, and `web-cli`, all:
- Running on **`agentpool`** (general compute, same as bff-viewer, bff-pems, astute-app services)
- Fixed at **1 replica** — no KEDA ScaledObject, no scale-to-zero
- Istio Sidecar with **explicit egress** to astute-app services only (auth-service, patient-service, study-service, calc-service, measuring-service, diameter-service, protocol-service, storage-azure, otel-collector)
- mTLS STRICT + JWT AuthorizationPolicy matching the namespace pattern of astute-viewer/astute-pems

The CLI binary (`astute`) runs **locally** (engineer's machine). It is not a cluster pod. `mcp-cli` is a cluster pod in the `astute-cli` namespace.

## Consequences

- All three services are always warm — no cold-start latency on demo day or during agent-driven workflows.
- Agents (Claude Desktop, Cursor, etc.) connect to `mcp-cli` via URL + credentials — no local install required for internal colleagues or eventually prospective customers.
- Namespace isolation is clean: `astute-cli` talks to `astute-app` only via enumerated Sidecar egress; external access enters only through the Istio Gateway.
- Widget iframes load from `web-cli` and call `bff-cli` directly for data — no PHI routing through the model.
- Three new services to build, chart, and deploy (Helm chart for `astute-cli` namespace follows the same structure as `astute-viewer`/`astute-pems`).
- `astute-core` is a shared npm package imported in-process by both `mcp-cli` (cluster) and `astute-cli` (local binary).

## Alternatives rejected

**MCP as local stdio process:** Every new user (internal colleague, prospective customer) must install and configure locally. Since the data never leaves the cluster anyway, remote HTTP/SSE is strictly easier to share and no harder to secure.

**MCP dual transport:** Adds complexity without benefit if remote-only is sufficient for all use cases.

**Put bff-cli in astute-app namespace:** Pollutes the core platform namespace with an agent-facing concern. Makes it harder to scope Istio policies and egress rules separately.

**Put services on the ingest nodepool:** Would inherit scale-to-zero with 3+ minute cold starts. Unacceptable for a demo platform or interactive agent use.

**Serve widgets from bff-cli:** Conflates an API service with a static file server. Harder to cache, harder to separate deployment concerns.
