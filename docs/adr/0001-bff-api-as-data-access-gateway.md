# ADR-0001: bff-cli as the data access gateway for astute-core

**Date:** 2026-06-20  
**Status:** Accepted

## Context

`astute-core` needs to fetch clinical data from the Astute microservice mesh (service-patient, service-study, service-calc, service-measuring, service-diameter, etc.). Two options exist:

1. **Direct service calls** — core holds URLs and auth headers for each service, fans out itself.
2. **BFF pattern** — a dedicated `bff-cli` service aggregates calls to the mesh; core calls one endpoint with a Bearer JWT.

The existing BFFs (bff-viewer, bff-pems) already establish the pattern in this codebase: browser clients never call microservices directly; a BFF owns the fan-out.

## Decision

Introduce `bff-cli` as the single data-access gateway for agent/CLI consumers. `astute-core` passes the user's Bearer JWT to `bff-cli`; all service fan-out, measurement file resolution, and response shaping happens there.

## Consequences

- `astute-core` has one upstream dependency (bff-cli URL + auth), not N service URLs.
- Auth is real: bff-cli validates JWTs against the existing auth-service JWKS (astute@imaging issuer), identical to every other BFF. No stopgap tokens or separate demo IdP.
- Service mesh topology changes (new services, renamed routes) are absorbed in `bff-cli`, not in the SDK.
- `bff-cli` is a new service to build and deploy alongside astute-cli and mcp-cli.
- The egress audit line (clinician, patientId, fields, timestamp) can be enforced centrally in `bff-cli` rather than duplicated in core.

## Alternatives rejected

**Direct service calls from core:** Couples the SDK to internal service topology. Breaks the established BFF contract that non-browser callers also go through a BFF. Distributes the measurement file-vs-DB resolution problem into every consumer.
