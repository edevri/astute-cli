# Astute Agent Platform — Phase 1 Implementation Plan

*All architecture decisions are locked in CONTEXT.md and docs/adr/. This plan is agent-ready: each milestone is independently executable, dependencies are explicit, and acceptance criteria are binary.*

---

## Repos to create

| Repo | Description |
|------|-------------|
| `astute-cli` | npm monorepo (`packages/astute-core` + `packages/astute-cli`) |
| `bff-cli` | Node/TypeScript BFF cluster service |
| `mcp-cli` | Node/TypeScript MCP server cluster service |
| `web-cli` | Static widget file server |

---

## M0 — Monorepo scaffold

**Goal:** Runnable skeleton — both packages build, `astute-cli` binary executes, `astute-core` exports types.

**Deliverables:**
- `astute-cli/` repo with npm workspaces
  - `packages/astute-core/` — TypeScript library, empty exports, builds to `dist/`
  - `packages/astute-cli/` — TypeScript CLI binary, `#!/usr/bin/env node` entrypoint, depends on `astute-core`
- `tsconfig.json` at root with project references
- `package.json` at root with `workspaces: ["packages/*"]`
- `astute-cli` binary registered in `packages/astute-cli/package.json` `bin` field
- `npm run build` at root builds both packages in dependency order
- `astute --version` prints a version string

**No acceptance criteria beyond:** `npm run build` exits 0; `astute --version` runs.

---

## M1 — bff-cli scaffold + auth

**Goal:** `bff-cli` is a running Express service that validates JWTs via auth-service JWKS and returns 401 for unauthenticated requests. Deployable to the `astute-cli` namespace.

**Deliverables:**
- `bff-cli/` repo, Node/TypeScript, same structure as `bff-viewer`
- `GET /health` and `GET /ready` — unauthenticated, return 200
- JWT validation middleware using `astute@imaging` issuer + JWKS from `auth-service.astute-app`
- All other routes return 401 without a valid JWT
- `GET /me` — returns decoded JWT claims (for CLI auth verification)
- Dockerfile (arm64 + amd64)
- Helm chart values for `astute-cli` namespace:
  - 1 replica, agentpool nodeSelector
  - Istio Sidecar with egress to auth-service.astute-app only (expand in M2)
  - mTLS STRICT PeerAuthentication
  - JWT AuthorizationPolicy (deny unauthenticated except /health, /ready)
- `astute-core`: add `BffClient` class — wraps `fetch` with Bearer JWT header; `baseUrl` from env `ASTUTE_BFF_URL`

**Acceptance criteria:**
- [ ] `GET /health` returns 200 without token
- [ ] `GET /me` returns 401 without token
- [ ] `GET /me` returns decoded claims with a valid sandbox JWT
- [ ] Pod runs in `astute-cli` namespace on agentpool

---

## M2 — astute auth login + primitive operators (patient, study)

**Goal:** `astute auth login` works end-to-end; `astute patient list` and `astute study list <patientId>` return real data from the sandbox.

**Deliverables:**

**`bff-cli` additions:**
- `GET /patient` — proxies to `service-patient.astute-app /patient/physician-patients`; returns `[{ patientId, outsideId, sex }]` (no PHI names/DOB)
- `GET /patient/:id/studies` — proxies to `service-study.astute-app`; returns `[{ studyId, scanDate, anatomy, prepost, status, protocol }]` filtered to surveillance-eligible studies (`surveillance_measurements=2`, `status IN [A1Q, A1M]`)
- Sidecar egress expanded to include `patient-service.astute-app`, `study-service.astute-app`
- Egress audit log on every request: `{ clinician, endpoint, patientId?, timestamp }`

**`astute-core` additions:**
- `PatientOperator.list(): Promise<Patient[]>` — calls `GET /patient`
- `StudyOperator.listForPatient(patientId): Promise<Study[]>` — calls `GET /patient/:id/studies`
- `Patient` and `Study` TypeScript types (observed fields only, no derived)

**`astute-cli` additions:**
- `astute auth login` — prompts for username/password, calls auth-service, stores JWT in `~/.astute/token`
- `astute auth whoami` — prints decoded claims from stored token
- `astute patient list` — calls `PatientOperator.list()`, outputs JSON (default) or table (`--format table`)
- `astute study list <patientId>` — calls `StudyOperator.listForPatient()`, outputs JSON or table

**Acceptance criteria:**
- [ ] `astute auth login` stores a valid JWT
- [ ] `astute patient list` returns the sandbox patients scoped to the authenticated user
- [ ] `astute study list <id>` returns only surveillance-eligible studies for that patient
- [ ] Egress audit log entry appears for each call
- [ ] `patientId` returned by `patient list` is accepted by `study list` without error

---

## M3 — Measurement operator + IFU-envelope check

**Goal:** `astute measurement get <studyId> <field>` returns a real measurement value; `astute ifu check <patientId> <studyId>` runs the IFU-envelope check against all three device families and shows its work.

**Deliverables:**

**`bff-cli` additions:**
- `GET /study/:id/measurements` — fetches measurements for a study from `service-calc.astute-app` and/or `service-measuring.astute-app`; returns `[{ field, value, unit }]`
- Sidecar egress expanded to include `calc-service.astute-app`, `measuring-service.astute-app`, `diameter-service.astute-app`, `protocol-service.astute-app`

**`astute-core` additions:**
- `MeasurementOperator.getForStudy(studyId): Promise<Measurement[]>`
- `Measurement` type: `{ field: string, value: number, unit: string }`
- `IFUCheck.run(measurements: Measurement[], deviceFamily: DeviceFamily): IFUResult`
  - `IFUResult`: per-parameter `{ param, patientValue, ifuBound, pass: boolean, citation: string }`
  - Device taxonomy hardcoded from CONTEXT.md IFU table (Endurant IIs, Gore Excluder std, Gore Excluder Conformable, Cook Zenith Flex)
  - This is a pure function — no network call, no derived judgment, just pass/fail per parameter with IFU citation

**`astute-cli` additions:**
- `astute measurement get <studyId> [--field <name>]` — lists measurements for a study
- `astute ifu check <patientId> <studyId>` — runs IFU check against all device families, outputs a table: one row per device per parameter, with PASS/FAIL and the IFU bound cited

**Acceptance criteria:**
- [ ] `astute measurement get <studyId>` returns `max sac diameter`, `pnd1`, `pnd2`, `pnsz`, neck angles, iliac diameters for a pre-EVAR study
- [ ] `astute ifu check` shows PASS/FAIL for each parameter for each device family
- [ ] A study whose neck angulation is 65° shows FAIL for Endurant IIs and standard Excluder, PASS for Excluder Conformable
- [ ] Every FAIL row shows the IFU bound and the citation string (e.g. "Gore Excluder IFU — neck angulation ≤60°")

---

## M4 — Growth series + derived flags

**Goal:** `astute growth <patientId>` returns the sac diameter time-series with derived growth-rate flags and guideline provenance attached.

**Deliverables:**

**`bff-cli` additions:**
- `GET /patient/:id/growth` — fetches all pre-EVAR surveillance-eligible studies for the patient, retrieves `max sac diameter` for each, orders by `scanDate`, returns the time-series array

**`astute-core` additions:**
- `GrowthSeriesOperator.get(patientId): Promise<GrowthSeries>`
- `GrowthSeries`: `{ points: GrowthPoint[], derived: GrowthDerived }`
  - `GrowthPoint`: `{ studyId, scanDate, maxSacDiameterMm, observed: true }`
  - `GrowthDerived`:
    - `repairThresholdCrossed: boolean` — true if latest diameter ≥ threshold for patient sex
    - `acceleratedGrowth: boolean` — true if any interval exceeds 5 mm/6 mo or 10 mm/12 mo
    - `latestDiameterMm: number`
    - `provenance: string` — "SVS 2018 (primary); ESVS 2024 (secondary)"
- All derived fields computed in `astute-core`, never recomputed downstream

**`astute-cli` additions:**
- `astute growth <patientId>` — table output: date, diameter, interval delta, flags
- `--json` flag returns the full `GrowthSeries` object including `derived` with provenance

**Acceptance criteria:**
- [ ] `astute growth <patientId>` returns a time-ordered series for a patient with multiple pre-EVAR studies
- [ ] `repairThresholdCrossed: true` for a patient whose latest diameter exceeds the sex-appropriate threshold
- [ ] `acceleratedGrowth: true` for a patient with >5 mm growth over a 6-month interval
- [ ] `provenance` field is present on every `derived` output
- [ ] Raw `observed` measurements are never mutated or recomputed — only the `derived` wrapper changes

---

## M5 — Post-EVAR surveillance + two-channel return type

**Goal:** `astute surveillance <patientId>` returns post-op sac + endoleak data. The two-channel return type (`model` / `widgetOnly`) is implemented and enforced.

**Deliverables:**

**`bff-cli` additions:**
- `GET /patient/:id/surveillance` — fetches post-EVAR studies + `max sac diameter` + `endo vol to ao bifur` for each

**`astute-core` additions:**
- `SurveillanceOperator.get(patientId): Promise<SurveillanceResult>`
- `SurveillanceResult` uses the two-channel return type:
  - `model: { studyId, scanDate, sacDiameterMm, endoleakVolumeMm3, derived: { sacExpansionConcerning, endoleakPresent, provenance } }` — no identifiers
  - `widgetOnly: { patientName, dob, mrn }` — PHI, never enters `structuredContent`
- `TwoChannelResult<M, W>` generic type enforced at the TypeScript level — `model` and `widgetOnly` are structurally separate, no accidental identifier bleed
- `sacExpansionConcerning: true` if sac has grown ≥5 mm since repair — SVS 2018 / ESVS 2024

**`astute-cli` additions:**
- `astute surveillance <patientId>` — outputs `model` section only (no PHI in terminal); `--include-phi` flag for local dev only (clearly labelled)

**Acceptance criteria:**
- [ ] `astute surveillance` output contains no patient name, DOB, or MRN in the default output
- [ ] `model` section contains `sacExpansionConcerning` with provenance
- [ ] TypeScript compiler rejects any code that moves a field from `widgetOnly` into `model`
- [ ] `endoleakPresent: true` for a post-EVAR study with non-zero `endo vol to ao bifur`

---

## M6 — mcp-cli scaffold + first tools

**Goal:** `mcp-cli` is a running HTTP/SSE MCP server in the cluster. `find_patient`, `list_studies`, and `get_growth_series` are callable from Claude Desktop or Cursor pointing at the cluster URL.

**Deliverables:**

**`mcp-cli` repo:**
- Node/TypeScript, imports `astute-core` as npm dependency
- `@modelcontextprotocol/sdk` HTTP/SSE server
- `astute auth` flow: agent passes Bearer JWT via Authorization header; `mcp-cli` forwards to `bff-cli`
- Tools implemented (thin wrappers over `astute-core` operators):
  - `find_patient` — calls `PatientOperator.list()`, returns `structuredContent` (patientId, outsideId, sex only); audited as search-class
  - `list_studies` — calls `StudyOperator.listForPatient()`; returns `structuredContent`
  - `get_growth_series` — calls `GrowthSeriesOperator.get()`; returns `structuredContent` (model section only, derived flags + provenance)
- Dockerfile (arm64 + amd64)
- Helm chart values for `astute-cli` namespace (same pattern as bff-cli)

**Acceptance criteria:**
- [ ] Claude Desktop connects to `mcp-cli` via cluster URL and lists the three tools
- [ ] `find_patient` returns sandbox patients scoped to the authenticated user
- [ ] `get_growth_series` returns derived flags with provenance in `structuredContent`
- [ ] No patient identifiers appear in `structuredContent` for any tool
- [ ] Egress audit log entry for every tool call

---

## M7 — web-cli + widgets

**Goal:** Three widgets (AAA Growth, EVAR Planning, Surveillance) load in ChatGPT as ChatGPT Apps SDK iframes, rendering real data from `bff-cli` via `_meta`.

**Deliverables:**

**`web-cli` repo:**
- Static file server (nginx or equivalent), separate repo
- Serves three widget HTML/JS files:
  - `aaa-growth.html` — renders the growth time-series chart; derived flags pre-decided (`repairThresholdCrossed`, `acceleratedGrowth`)
  - `evar-planning.html` — renders the IFU-envelope check table; per-parameter PASS/FAIL with IFU citations
  - `surveillance.html` — renders post-EVAR sac + endoleak trend; `sacExpansionConcerning` flag pre-decided
- Each widget:
  - Reads PHI from `window.openai.toolResponseMetadata` (`_meta` / `widgetOnly` channel)
  - Reads clinical data from tool `structuredContent`
  - Renders derived flags as received — no clinical logic in widget JS
  - Shows guideline/IFU citation next to every derived flag
- Helm chart values for `astute-cli` namespace
- CORS configured to allow ChatGPT iframe origin

**`mcp-cli` additions — render tools:**
- `render_growth_widget` — returns `outputTemplate` with `web-cli` URL + `_meta` with PHI
- `render_evar_planning_widget` — same pattern
- `render_surveillance_widget` — same pattern

**Acceptance criteria:**
- [ ] Each widget loads in ChatGPT without console errors
- [ ] PHI (patient name) appears in the widget but is absent from `structuredContent`
- [ ] Derived flags (threshold crossed, concerning growth, endoleak present) render correctly for the golden patient arcs
- [ ] Every derived flag displays a guideline or IFU citation
- [ ] Architecture Conformance Checklist items 1–3 pass (PHI boundary, provenance, no-logic-in-widget)

---

## M8 — Architecture Conformance Checklist (automated)

**Goal:** The five checklist items from the synthesis are runnable tests, not manual assertions.

**Checklist items (from synthesis §6):**

- [ ] **PHI-boundary** — automated: scan all `structuredContent` / `content` payloads in integration tests for identifier field names (`patientName`, `dob`, `mrn`, `outsideId`); fail if any appear
- [ ] **Provenance** — automated: every `derived` field in every tool response has a non-empty `provenance` string; fail if absent
- [ ] **No-logic-in-widget** — automated: ESLint rule or bundle analysis confirms widget JS contains no comparison operators applied to clinical numeric fields
- [ ] **Egress-audit** — automated: integration test calls each tool, then asserts an audit log entry was emitted with correct fields
- [ ] **Auth-scope** — manual (documented): log in as user A and user B with different patient sets; confirm `find_patient` returns disjoint sets

**Deliverables:**
- Integration test suite in `mcp-cli` repo (or standalone `astute-conformance` script)
- Each automated check runs in CI
- `security-review.md` documents the manual auth-scope test procedure and the Phase 1 PHI boundary claim

---

## Sequencing and dependencies

```
M0 (monorepo scaffold)
  └── M1 (bff-cli + auth)
        └── M2 (auth login + patient/study operators)
              ├── M3 (measurements + IFU check)
              │     └── M4 (growth series + derived flags)
              │           └── M5 (post-EVAR + two-channel type)
              │                 └── M6 (mcp-cli + first tools)
              │                       └── M7 (web-cli + widgets)
              │                             └── M8 (conformance checklist)
              └── [golden-patient authoring — separate session, starts after M2]
```

M3, M4, M5 can be partially parallelised once M2's operators are in place. M6 requires M5 (two-channel type must exist before MCP tools are shaped). M7 requires M6.

---

## What is explicitly out of scope (Phase 1)

- Real EVAR sizing engine (IFU-envelope check is the substitute)
- OAuth authorization server (real auth-service used)
- Cross-platform (Claude) rich widgets (ChatGPT Apps SDK only)
- Direct-callback widget (PHI-in-`_meta` is the Phase 1 boundary)
- General patient search surface (scoped resolver only)
- Write operations, scheduling, task creation
- Demo 4 (executive/population) and its cohort widget (stretch only)
- Token refresh / rotation / revocation
