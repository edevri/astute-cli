# Demo 3 — Post-EVAR Surveillance (sac expansion + endoleak)

**Duration:** ~4 minutes  
**Patient:** Synthia TestAAA (ID 299001)  
**Story:** Continuing from Demo 2 — the EVAR was performed using the Gore Excluder Conformable. The patient is now in post-operative follow-up. At the 12-month scan, sac expansion and an endoleak are detected. Both flags warrant clinical re-evaluation.

---

## Setup

Ensure you are logged in (continues from Demo 2):

```bash
astute auth login
```

---

## Step 1 — Confirm post-op studies exist

```bash
astute study list 299001 --format table
```

**Output:**
```
studyId     patientId     scanDate                  anatomy     prepost     status
--------------------------------------------------------------------------------------
299202      299001        2024-01-15                aaa         post-op     A1M
299201      299001        2023-06-01                aaa         post-op     A1M
299103      299001        2023-01-20                aaa         pre-op      A1M
299102      299001        2022-07-15                aaa         pre-op      A1M
299101      299001        2022-01-10                aaa         pre-op      A1M
```

**What to say:** "After the repair, the patient has two post-operative follow-up scans — six months and twelve months post-EVAR. Let's look at the surveillance data."

---

## Step 2 — Run post-EVAR surveillance

```bash
astute surveillance 299001
```

**Output:**
```
STUDY ID    DATE          SAC (mm)      ENDOLEAK (mm³)    FLAGS
--------------------------------------------------------------------------------
299201      2023-06-01    50.0          0.0               —
299202      2024-01-15    57.3          1850.0            SAC-EXPANSION, ENDOLEAK
```

**What to say:** "At six months the sac measured 50mm with no endoleak — a reassuring early result. At twelve months the picture has changed: the sac is now 57.3mm, 7.3mm larger than at the six-month scan. That exceeds the 5mm expansion threshold flagged by ESVS 2024. And there's a non-zero endoleak volume of 1850mm³. Both flags are lit."

---

## Step 3 — Render the surveillance widget in ChatGPT

In ChatGPT (with the Astute MCP connected), type:

> Show me the post-EVAR surveillance data for patient 299001. Are there any concerning findings?

**Expected widget:** The surveillance widget renders the two post-op scans with a timeline view. The 2024-01-15 scan is annotated with SAC-EXPANSION and ENDOLEAK flags. Provenance cited.

**What to say:** "The agent surfaces both findings immediately. It doesn't interpret — it presents the derived flags and the measurements that drove them, with the guideline cited. The clinical judgment stays with the surgeon."

---

## Full journey recap (if running all three demos)

This patient's complete arc in three demos:

| Demo | Date | Finding | Action |
|---|---|---|---|
| 1 — Growth | Jan 2023 | AAA 55.2mm, growth >10mm/yr, THRESHOLD | Refer for repair evaluation |
| 2 — IFU | Jan 2023 | Only Conformable fits (65° neck angle) | Select Gore Excluder Conformable |
| 3 — Surveillance | Jan 2024 | Sac expansion 7.3mm, endoleak 1850mm³ | Re-evaluate; possible type II endoleak |

**What to say:** "Three tools, one patient, one complete clinical story — from first red flag through device selection to post-op follow-up. Every derived flag is traceable to a published guideline. No PHI entered the model at any point."

---

## Clinical talking points

- Sac expansion >5mm post-EVAR is the **ESVS 2024** criterion for surveillance re-evaluation.
- A non-zero endoleak volume indicates continued flow into the aneurysm sac after repair — type II endoleak is the most common cause and can lead to sac re-pressurisation.
- The combination of sac expansion AND endoleak is the most concerning post-EVAR finding; either alone may warrant watchful waiting.
- The surveillance interval (6 months, 12 months) follows standard EVAR follow-up protocols.
