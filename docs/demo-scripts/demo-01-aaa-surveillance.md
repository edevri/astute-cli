# Demo 1 — AAA Surveillance (growth-to-threshold)

**Duration:** ~5 minutes  
**Patient:** Synthia TestAAA (ID 299001)  
**Story:** A pre-operative AAA patient with a clean growth curve that crosses the repair threshold at the most recent scan. The demo shows the CLI output, then the widget rendering in ChatGPT.

---

## Setup

Ensure you are logged in and the stack is running:

```bash
astute auth login
```

---

## Step 1 — Find the patient

```bash
astute patient list --include-phi --format table
```

**Output:**
```
patientId   sex     outsideId       firstName       lastName        dob
------------------------------------------------------------------------
299001                              Synthia         TestAAA         1945-03-15
...
```

**What to say:** "We search for our patient by name. Here she is — Synthia TestAAA, patient ID 299001."

---

## Step 2 — Review studies

```bash
astute study list 299001 --format table
```

**Output:**
```
studyId     patientId     scanDate                  anatomy     prepost     status
--------------------------------------------------------------------------------------
299103      299001        2023-01-20                aaa         pre-op      A1M
299102      299001        2022-07-15                aaa         pre-op      A1M
299101      299001        2022-01-10                aaa         pre-op      A1M
```

**What to say:** "She has three pre-operative AAA studies spanning about a year. Let's look at the growth trend."

---

## Step 3 — Run the growth analysis

```bash
astute growth 299001
```

**Output:**
```
DATE          DIAMETER (mm)     DELTA       FLAGS
--------------------------------------------------------
2022-01-10    42.0              —
2022-07-15    48.5              +6.5
2023-01-20    55.2              +6.7        THRESHOLD

Provenance: SVS 2018 (primary); ESVS 2024 (secondary)
```

**What to say:** "In January 2022 the sac was 42mm — below the repair threshold. Six months later it had grown 6.5mm. By January 2023 it crossed 55mm — the SVS 2018 repair threshold — and grew more than 10mm in the preceding 12 months, which independently qualifies as accelerated growth. This patient needs to be evaluated for repair."

---

## Step 4 — Render the growth widget in ChatGPT

In ChatGPT (with the Astute MCP connected), type:

> Show me the AAA growth trend for patient 299001 and flag any threshold crossings.

**Expected widget:** The AAA Growth widget renders with the three data points plotted, the threshold line at 55mm, and the THRESHOLD flag annotated on the 2023-01-20 scan. Provenance citation shown below.

**What to say:** "The agent calls the growth tool, retrieves the derived flags, and renders the widget — no raw patient data enters the model context. The threshold flag is surfaced directly from the clinical guideline logic, with the source cited."

---

## Clinical talking points

- The 55mm diameter threshold follows **SVS 2018** as primary authority; **ESVS 2024** is cited as secondary.
- Growth rate >10mm/year is an independent repair criterion — this patient qualifies on both measures.
- The widget renders in the operator's ChatGPT session; no PHI is passed to the model.
