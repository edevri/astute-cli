# astute-cli — Domain Context

## Bounded Context

Agent-first clinical decision-support for AAA (Abdominal Aortic Aneurysm) vascular workflows.
Phase 1 scope: demo platform for prospective US healthcare customers ("D-audience"). Operator-driven demo, synthetic patients, single Astute-controlled sandbox tenant.

---

## Glossary

### Clinical Domain

**AAA (Abdominal Aortic Aneurysm)**
Pathological dilation of the infrarenal aorta. The clinical subject of the Phase 1 demo.

**Repair Threshold**
The diameter at which elective surgical repair is recommended.
- ≥5.5 cm (men) — SVS 2018 (primary)
- ≥5.0 cm (women) — SVS 2018 (primary)
- Consistent with ESVS 2024 (secondary; cited for global audiences)

**Accelerated Growth**
Sac growth rate that triggers earlier-than-scheduled surveillance or repair consideration.
- >5 mm over 6 months, or >10 mm over 12 months — SVS 2018 / ESVS 2024

**Concerning Sac Growth (post-EVAR)**
Sac enlargement after EVAR repair that indicates potential endoleak or failure.
- ≥5 mm enlargement at any follow-up interval — SVS 2018 / ESVS 2024

**Endoleak**
Persistent blood flow outside the EVAR graft lumen but within the aneurysm sac. A key post-op surveillance finding.

**EVAR (Endovascular Aneurysm Repair)**
Minimally invasive repair via catheter-delivered stent-graft. The primary repair modality tracked in Phase 1 widgets.

**IFU (Instructions for Use)**
Manufacturer-published anatomical eligibility envelopes for a specific EVAR device model. IFU-envelope checks are the Phase 1 mechanism for device fit assessment (not a sizing engine).

**IFU-Envelope Check**
A transparent pass/fail check of patient anatomy against published IFU parameters for a given device family. Displays each parameter's value vs. the IFU bound. Does not produce a recommendation — shows its work and cites the IFU.

**Device Taxonomy**
Structured reference data: vendor → family → model → IFU envelope. Three confirmed device families with accurate published IFU numbers (see table below). Cook and Gore are active commercial relationships; Medtronic is included for completeness and contrasting anatomy coverage.

| Vendor | Family | Neck Ø (mm) | Neck length | Neck angle | Iliac Ø (mm) | Iliac seal | Notes |
|--------|--------|-------------|-------------|------------|--------------|------------|-------|
| Medtronic | Endurant IIs | 19–32 | ≥10 mm (≥15 preferred) | ≤60° infrarenal | 8–25 | ≥15 mm | Broadest neck-length tolerance with EndoAnchor option |
| Gore | Excluder (standard) | 19–32 | ≥15 mm | ≤60° | 8–25 | ≥10 mm | Standard workhorse; narrow angulation tolerance |
| Gore | Excluder Conformable | 16–32 | ≥10 mm | ≤90° | 8–25 | ≥10 mm | Challenging anatomy; passes cases standard Excluder fails |
| Cook | Zenith Flex | 20–26 | ≥15 mm | ≤60° infrarenal; ≤45° suprarenal | 7.5–20 | ≥10 mm | Tighter neck Ø and dual-angulation constraint; narrowest iliac range |

IFU sources: [Endurant IIs FDA filing](https://www.accessdata.fda.gov/cdrh_docs/pdf10/P100021S063D.pdf) · [Gore Excluder specifications](https://www.goremedical.com/products/excluder/specifications) · [Cook Zenith Flex product page](https://www.cookmedical.com/aortic-intervention/zenith-home/zenith-flex-aaa-endovascular-graft/)

### Architecture Domain

**Repos**
- `astute-cli` — npm monorepo with two packages: `packages/astute-core` (core library) and `packages/astute-cli` (CLI binary). Each published as a separate npm package.
- `bff-cli` — Node/TypeScript cluster service, separate repo, follows bff-viewer/bff-pems pattern.
- `mcp-cli` — Node/TypeScript cluster service, separate repo, imports `astute-core` package.
- `web-cli` — Static file server, separate repo, follows web-viewer/web-pems pattern.

**astute-core**
The canonical capability layer inside the `astute-cli` npm package. Calls `bff-cli` with the authenticated user's JWT. Implements the two-channel return type, observed/derived split, provenance attachment, token propagation, and egress audit. Both the CLI binary and `mcp-cli` call core in-process — neither shells out to the other.

**astute-cli (CLI binary)**
Thin wrapper over `astute-core`. Lives in `packages/astute-cli` in the monorepo. argparse + JSON/table/markdown output. JSON-first (agent-first). Runs locally; calls `bff-cli` over HTTPS.

**bff-cli**
Backend-for-Frontend for agent/CLI consumers. Mirrors the bff-viewer/bff-pems pattern but optimised for machine callers. Receives a Bearer JWT, validates via service-authenticate JWKS, and fans out to the appropriate astute-app microservices. Node/TypeScript. Fixed at 1 replica on agentpool — always warm, no scale-to-zero.

**mcp-cli**
MCP server (HTTP/SSE transport). Thin wrapper over `astute-core` (imported as an npm dependency). Deployed as a cluster service in the `astute-cli` namespace. Agents connect via URL + credentials — no local install required.

**web-cli**
Static file server for ChatGPT Apps SDK widget HTML/JS files (Timeline, AAA Growth, EVAR Planning, Surveillance). Widgets call `bff-cli` for data. Fixed at 1 replica on agentpool.

**astute-cli namespace**
Kubernetes namespace containing `bff-cli`, `mcp-cli`, and `web-cli`. Follows the BFF namespace pattern (astute-viewer, astute-pems). Istio Sidecar egress enumerates only the astute-app services needed (auth-service, patient-service, study-service, calc-service, measuring-service, diameter-service, protocol-service, storage-azure, otel-collector). mTLS STRICT, JWT AuthorizationPolicy. No ingest nodepool dependency — no cold-start risk.

```
Astute microservices (service-patient, service-study, service-calc, …)
             ↑
         bff-cli  [astute-cli namespace, agentpool, 1 replica]
        ↑       ↑                                ↑
  astute-cli   mcp-cli                        web-cli
  (local     [astute-cli namespace,          [widget HTML/JS]
   binary)    agentpool, 1 replica,
              HTTP/SSE]
     │              │
  astute-core  ◄────┘
  (shared npm pkg, in-process in both;
   lives in monorepo packages/astute-core)
```

**Two-Channel Return Type**
Every tool/function returns:
- `model` section — de-identified, safe for the model's reasoning context → `structuredContent`
- `widgetOnly` section — may contain PHI, routed to UI only → `_meta`

Identifiers never appear in `structuredContent`/`content`.

**observed vs. derived**
- `observed`: raw fetched fields from the platform (measurements, dates, imaging results)
- `derived`: clinical judgments computed in astute-cli (core library) (flags, thresholds, risk levels) — each carries explicit guideline/IFU provenance

**Provenance**
Every derived field carries the guideline citation that produced it (e.g. "SVS 2018 §X; ESVS 2024 Rec. Y"). A derived flag without a citation fails the Architecture Conformance Checklist.

**find_patient (resolver)**
Scoped patient lookup: returns `patient_id` + `outside_id` (MRN-like) + `sex` as the minimal non-identifying clinical disambiguator. Implemented by calling `GET /patient/physician-patients` on service-patient — access is enforced **at the DB/query level** by that service (via `physician_patient_associations` + `patient_group_associations`, keyed off `user_id` in the JWT). No access filtering needed in core or MCP. Audited as search-class egress.

**Egress Audit Line**
A structured log entry emitted on every tool call: clinician, patientId, fields returned, timestamp. Resolver calls flagged search-class.

**Study**
The primary clinical container. Each study represents one imaging timepoint for a patient.
Key fields: `modelno` (study ID), `patient_id`, `scandate` (date string), `anatomy` ("aaa/taa" etc.), `prepost` ("pre" or "post"), `status`, `surveillance_measurements`, `measurements_protocol`.
Multiple studies per patient ordered by `scandate` form the growth time-series.

**Protocol**
Defines which measurements are captured for a study type.
- `MMS-SRV-pre` — pre-EVAR AAA surveillance measurements
- `MMS-SRV-post` — post-EVAR surveillance measurements

**Measurement Fields (AAA-relevant)**

Pre-EVAR anatomy (maps to IFU-envelope check parameters):
| Field | Meaning | IFU param |
|-------|---------|-----------|
| `max sac diameter` | Max AAA sac Ø (mm) | Growth/threshold tracking |
| `pnd1` | Proximal neck Ø proximal (mm) | Neck diameter |
| `pnd2` | Proximal neck Ø distal (mm) | Neck diameter |
| `pnsz` | Proximal neck length (mm) | Neck length |
| `suprarenal-pn angle` | Suprarenal angulation (°) | Neck angle (suprarenal) |
| `pn-aaa angle` | Infrarenal neck-to-AAA angle (°) | Neck angle (infrarenal) |
| `rcia-av` / `lcia-av` | Common iliac Ø at landing zone (mm) | Iliac diameter |
| `rt fem av dia` / `lt fem av dia` | Ext iliac representative Ø (mm) | Iliac access |

Post-EVAR surveillance:
| Field | Meaning |
|-------|---------|
| `max sac diameter` | Post-op sac Ø — ≥5 mm increase = concerning |
| `endo vol to ao bifur` | Endoleak volume (mm³) |

**Surveillance-Eligible Study**
A study with `surveillance_measurements = "2"` and `status IN ("A1Q", "A1M")`. Only these studies enter growth-curve and post-EVAR surveillance queries.

**Golden-Patient Set**
A curated set of 4–6 synthetic patients authored through the real API into the sandbox, each embodying a specific clinical arc (growth-to-threshold; EVAR-fit + borderline IFU-fail; post-op sac expansion + endoleak; cohort spread). Authored before any widget code.

**D-audience**
Prospective healthcare customers in the demo evaluation phase. The demo is operator-driven; D-audience never touches the system directly in Phase 1.

**Sandbox Tenant**
Single Astute-controlled tenant with synthetic patients used for all Phase 1 demos.

**Auth (Phase 1)**
Real authentication via the existing auth-service (astute@imaging issuer, JWKS at auth-service.astute-app). No stopgap JWT or separate demo IdP. `astute auth login` calls auth-service and stores the JWT locally. bff-cli validates tokens against the same JWKS as every other BFF. The CLI user is a real provisioned user in the sandbox tenant.

### PHI Boundary

**Phase 1 provable claim:** "No PHI enters the model's reasoning context."
PHI is in `widgetOnly` / `_meta` — it reaches the iframe UI but not the model's input tokens.

**Production target (parked, ADR'd):** "No PHI touches the vendor at all." Achieved via direct-callback widget (iframe authenticates back to Astute for PHI directly).

---

## Guideline Sources

| Guideline | Role | Citation |
|-----------|------|----------|
| SVS 2018 | Primary (US audience) | Chaikof EL et al. J Vasc Surg. 2018;67(1):2-77.e2 |
| ESVS 2024 | Secondary (global audience) | Wanhainen A et al. Eur J Vasc Endovasc Surg. 2024;67(2):192-331 |
