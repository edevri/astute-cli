# Astute Agent Platform — AAA Vertical Slice
## Phase 1 Design Synthesis & Build Hand-off

*Output of a structured design interview. Every decision below was made deliberately during that interview; parked items are deferred on purpose, not forgotten.*

---

## 0. The Frame (everything inherits this)

**Audience:** Prospective healthcare customers evaluating a pilot ("D-audience"). Not internal-only, not investors.

**Operating model:** You drive the demo. Prospect watches. Single Astute-controlled **sandbox tenant** with **synthetic patients**. No prospect ever touches their own data in Phase 1 (that's a pilot, behind its own gate).

**Real vs. mocked:** The API, CLI, and core are **real** (they're dual-purpose — also your engineers' agent-driven test/data-access path). Security, PHI handling, and tenancy are **real-in-story, mocked-in-code**: a buyer isn't buying widgets, they're buying the architecture story, so the *claims* must be crisp and provable even where the *plumbing* is stubbed.

**Design principle — agent-first:** Both consumers (AI agents, and engineers-via-agents) are machines. When human-readability and machine-readability conflict, the **structured JSON contract wins**; table/markdown output is cosmetic presentation.

---

## 1. Top 10 Risks (ranked by severity)

| # | Risk | Why it bites | Mitigation locked in this interview |
|---|------|--------------|--------------------------------------|
| 1 | **Golden-patient data doesn't exist in demo-ready shape.** Schema is correct (patient→study→protocol→measurement→value) and AAA fields exist, but patients aren't back-populated into clinically coherent stories. | This is the critical path and it's currently invisible in the plan, which assumes the data is "just there." Build widgets first and you'll rework widget + query + narrative together when the authored patient doesn't cross the threshold the widget assumed. | **Author the golden-patient set up front**, through the real API path, *before* any widget. Audit becomes an end-of-build drift check, not the first look. |
| 2 | **Resolver (`find_patient`) cross-patient scope.** A search/resolve tool ranges across patients; existence itself is disclosure. | "Fetch all, filter in MCP" is the classic broken-access-control finding a security reviewer lives to catch. | Scope **delegated to the platform access model** ("which patients can this user see, matching X"), enforced **in core at the query**, never filtered in the MCP layer. |
| 3 | **Overclaiming the PHI boundary.** `_meta` is hidden *from the model* but is **UI-only, not secure** — it still transits OpenAI to reach the iframe. | If you claim "PHI never touches the vendor" and a reviewer traces the iframe data path, you lose the room. | Phase-1 claim is the narrower, **true** one: *"no PHI in the model's reasoning context."* "No PHI to vendor at all" is the ADR'd production target via direct-callback widget. |
| 4 | **Device fitting scope creep / wrong IFU numbers.** "Candidate devices" implies a sizing engine; wrong numbers in front of a vascular surgeon destroy trust in everything else on screen. | A real EVAR-sizing engine is regulated-adjacent and the most over-ambitious thing left in Phase 1. | "Candidate" = **transparent IFU-envelope interval check that shows its work and cites the IFU**, not a recommendation. Real sizing engine parked. Use **accurate published IFU numbers** for 2–3 families. |
| 5 | **Apps SDK reality heavier than "you-drive demo" implied.** The SDK expects OAuth 2.1/OIDC with discovery, ChatGPT as public client; widgets render in iframes on desktop *and* mobile with their own constraints. | The auth work you parked is partly *required by the platform*, not optional. | ChatGPT-only for Phase 1 (cross-platform = portability claim, not a build). OAuth-server decision parked **with the Apps-SDK requirement noted** so it's scoped honestly next session. |
| 6 | **Derived judgments without provenance = toy, not decision-support.** "Threshold," "candidate," "concerning," "high-risk" are *conclusions*, not data. | A number turning red is a toy; a number turning red *with the guideline citation that made it red* is the clinical-decision-support story — and the absence of provenance is also a correctness liability. | Every **derived** field computed in core, carries explicit **guideline/IFU provenance**. Widgets render pre-decided flags, never recompute. |
| 7 | **Auth-server build as a multi-week side quest.** Being an OAuth *authorization server* (discovery, JWKS, rotation, conformance) is weeks-with-a-long-tail, not the weekend a *client* rebuild was. | It competes directly with the only two things the spike exists to prove: tool-shape and widget-compellingness. A hand-rolled server is itself an *objection* to a security reviewer. | Parked behind the Pilot gate; revisit **with source access**. Demo runs on a real-enough stopgap JWT with the correct trust *shape*. |
| 8 | **Live token expiry faceplant.** MCP server is long-lived; tokens expire. | A token dying in front of a prospect. | Long-TTL demo tokens (~8h), no refresh flow in Phase 1, CLI surfaces a clean `run astute auth login` error, not a stack trace. |
| 9 | **Executive/population demo is the thinnest and most data-hungry.** It needs a coherent *cohort* spread, not one patient. | Highest authoring cost, least central to the AAA clinical narrative. | Treat as the **stretch demo** — see cuts. |
| 10 | **Aggregate scope.** Core + CLI + MCP + 4 widgets + 4 demos + device taxonomy + auth, all labelled "Phase 1." | Death by breadth; the compelling 80% gets diluted by the last 20%. | Phase cuts below pull the smallest credible path to the front. |

---

## 2. Recommended Phase Cuts

**Cut from Phase 1 (park behind the Pilot-Readiness gate):**

- **Real EVAR sizing engine** → replace with transparent IFU-envelope check.
- **Conformant OAuth authorization server** → stopgap JWT with correct trust shape; build the real server with source access.
- **Cross-platform (Claude) rich widgets** → ChatGPT Apps SDK only; portability is an architecture *claim* backed by the vendor-neutral core.
- **Direct-callback widget** ("no PHI to vendor at all") → use `_meta` for Phase 1.
- **`find_patient` as a general search surface** → narrow resolver only (ID + minimal clinical disambiguator).
- **All write ops, scheduling, task creation** (already cut).

**Demote to stretch:**

- **Demo 4 (Executive/population)** and its dashboard widget. It's the most data-hungry and least central to the AAA clinical arc. Ship Demos 1–3 as the credible core; add 4 only if cohort authoring is cheap once the golden set exists.

**Smallest credible demo path:** Golden data → core → CLI → MCP → **3 widgets** (Timeline, AAA Growth, EVAR Planning) → **Demos 1–3**. Surveillance widget + Demo 3 are arguably the single most clinically compelling moment (sac growth + endoleak), so keep that one even if trimming elsewhere.

---

## 3. Revised Milestone Plan

> Sequencing principle: **data is an input, not a final validation step.** The judgment rules and golden patients come *before* the code that renders them.

**M0 — Data & Rules Foundation** *(the inverted-to-front work)*
- One-day **data audit** against the sandbox: confirm each of the four AAA data shapes (growth time-series; neck/iliac anatomy; post-op sac + endoleak; cohort spread) is structured & queryable.
- Write the **explicit rule behind every derived flag** (intervention threshold + guideline source; IFU envelopes per family; "concerning" sac-growth definition; "requiring follow-up"/"high-risk" definition). *This one artifact triples as core logic, provenance text, and golden-patient authoring spec.*
- Author the **golden-patient set** (4–6 patients) through the real API into the sandbox: one clean growth-to-threshold curve; one clean EVAR-fit + one borderline IFU-fail; one post-op sac-expansion-plus-endoleak arc; a cohort spread (if Demo 4 survives).

**M1 — `astute-core`** (the canonical contract)
- Typed, auth-aware capability layer over the SDK.
- **Two-channel return type:** `model` section (de-identified) + `widgetOnly` section (PHI). Structure enforces the policy.
- **`observed` vs `derived`** field split; derived flags computed here with provenance attached.
- **Token propagation** (per-user principal) and **egress audit line** implemented **once, here**.
- **Device taxonomy:** vendor → family → model → IFU envelope as structured reference data (2–3 real families, accurate IFU numbers).

**M2 — CLI** (thin wrapper over core)
- `core` + argparse + JSON/table/markdown formatting. JSON-first (agent-first). Provenance in output.

**M3 — MCP server** (thin wrapper over core, in-process — *not* shelling out to the CLI)
- **Data tools** → `structuredContent` (de-identified, model-visible).
- **Render tools** → carry `outputTemplate`; PHI in `_meta` (UI-only).
- **`find_patient` resolver:** scoped via platform access model, returns ID + minimal clinical disambiguator, audited as search-class.
- Clinical tools take explicit `patientId`.

**M4 — Widgets** (ChatGPT Apps SDK, iframe)
- Timeline, AAA Growth, EVAR Planning (+ Surveillance). Render `derived` flags **pre-decided**; PHI hydrated from `_meta` via `window.openai.toolResponseMetadata`. No clinical logic in widget JS.

**M5 — Demo scripting + Conformance Checklist**
- Demos 1–3 (+4 stretch) scripted against golden data.
- **Architecture Conformance Checklist** (the 5 assertions) made runnable.

**M6 — Drift audit + Security review**
- End-of-build "is it demo-ready / did we drift" audit.
- ADRs + the one **data-flow diagram** for the vendor boundary; `security-review.md`.

---

## 4. Questions You Must Answer Before Implementation

1. **The derived rules, exactly.** What guideline backs the intervention threshold (SVS/ESVS, and the exact diameter)? What defines "concerning" sac growth (absolute mm? % over interval?)? What defines "requiring follow-up" / "high-risk" for the cohort view? *These are blockers — the golden patients can't be authored without them.*
2. **Which 2–3 device families**, and where do the **published IFU envelopes** come from (so the numbers are defensible to a surgeon)?
3. **Does the platform access model expose a clean "patients matching X that this user may see" query**, or does the resolver need a thin core adapter over it?
4. **Demo count for v1:** 3 or 4? Is the Executive demo in or out of the smallest credible path?
5. **Stopgap token mechanics:** how is the demo JWT minted *before* the OAuth server exists, and what's in its claims (so the trust *shape* is truthful)?
6. **Golden-patient count and exact stories** — lock the narrative arc for each before authoring.

---

## 5. Concrete Changes to the Implementation Prompt

Rewrite these specific lines/sections of the original plan:

1. **Architecture diagram — replace the linear stack.**
   *Was:* `Astute API → SDK → CLI → MCP → model` (implies MCP shells out to CLI).
   *Now:*
   ```
   Astute API → astute-core (SDK + business capabilities, typed, auth-aware)
                   ├── astute-cli   (core + argparse + json/table/md)
                   └── astute-mcp   (core + tool schemas + model-facing contract)
   ```
   The canonical contract is **core's typed interface**, not text-over-stdout.

2. **Principle #3 wording.** *Was:* "MCP tools are thin wrappers around CLI commands." *Now:* "MCP tools are thin wrappers around shared `astute-core` capabilities, called in-process."

3. **Add the two-channel contract requirement.** Every tool returns a `model` section (de-identified, → `structuredContent`) and a `widgetOnly` section (PHI, → `_meta`). Identifiers **never** appear in `structuredContent`/`content`. Make the split structural in the core return type.

4. **Add `observed` vs `derived` + provenance.** Every widget contract separates raw fetched fields from derived clinical judgments. Every derived field is computed in core and carries guideline/IFU provenance. Widgets render derived flags pre-decided; they never recompute.

5. **Replace device "candidates."** *Was:* "candidate devices listed." *Now:* "for each device family, a transparent IFU-envelope check that displays each parameter's pass/fail against the published IFU value." Full vendor/family/model/IFU **taxonomy** defined now; sizing engine parked.

6. **Add the resolver, scoped.** Include `find_patient`: scoped via the platform access model in core, returns `patientId` + minimal non-identifying clinical disambiguator only, audited as a search-class egress event. Clinical tools take explicit `patientId`.

7. **Platform target.** ChatGPT Apps SDK only for Phase 1. Keep core/CLI/MCP/contract vendor-neutral; cross-platform is a portability claim, not a build.

8. **Sequencing.** Author the golden-patient set (through the real API) and write the derived-rule spec **before** any widget or demo code.

9. **Acceptance criteria.** Add two tiers — **functional** (right tool fires, widget renders from real core data, derived flag matches the authored story) and **architectural** (the 5 assertions below) — and make the architectural set a runnable **Architecture Conformance Checklist** handed to the buyer's security reviewer.

10. **PHI claim, stated honestly.** Phase-1 provable claim: *"No PHI enters the model's reasoning context."* Production target (ADR'd, parked): *"No PHI touches the vendor,"* via direct-callback widgets.

---

## 6. Architecture Conformance Checklist (the buyer-facing artifact)

> Runnable. This one page is worth more to a security reviewer than a fifth widget — it's the difference between "trust us" and "here's the test that proves it."

- [ ] **PHI-boundary:** every tool's `structuredContent`/`content` contains **zero** direct identifiers; identifiers appear **only** in `_meta`. *(automated)*
- [ ] **Provenance:** every derived flag rendered in every widget carries a guideline/IFU citation. A red threshold with no source **fails**.
- [ ] **No-logic-in-widget:** widgets receive derived flags **pre-decided** from core (e.g. `crossed: true`), not raw numbers they compare.
- [ ] **Egress-audit:** every tool call emits an audit line — clinician, patient ID, fields returned, timestamp; resolver calls flagged search-class.
- [ ] **Auth-scope:** the resolver returns only sandbox patients the authenticated clinician is permitted to see (provable by logging in as a second user with a different permitted set).

---

## 7. Parked Items (deferred on purpose — Pilot-Readiness gate)

- **OAuth authorization server** — build-vs-buy revisited **with source access**. No IdP today; intent is to build OAuth 2.1. Note: the Apps SDK *requires* OAuth 2.1/OIDC with discovery (`/.well-known/oauth-protected-resource`) and ChatGPT-as-public-client, so this is **less optional** than the you-drive framing implied. Evaluate device grant (RFC 8628) vs. redirect+PKCE; consider adopting an existing IdP rather than hand-rolling.
- **Direct-callback widget** — iframe authenticates back to Astute for PHI, so PHI never transits the vendor. Production target for the "no PHI to vendor at all" claim.
- **Real EVAR sizing engine** — fed by the taxonomy authored now.
- **Production multi-tenancy** — own-tenant vs. shared-tenant-by-tier.
- **Token refresh / rotation / revocation** — rides with the OAuth-server work.
- **General patient search surface** — beyond the narrow resolver.
- **Cross-platform (Claude) rich widgets.**
- **Signed BAA / production retention config** — real-in-story (ADR + diagram) for the demo.

