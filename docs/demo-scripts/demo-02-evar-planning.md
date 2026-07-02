# Demo 2 — EVAR Planning (IFU-envelope check)

**Duration:** ~5 minutes  
**Patient:** Synthia TestAAA (ID 299001)  
**Story:** Continuing from Demo 1 — the patient has just crossed the repair threshold. The operator runs an IFU envelope check to identify which device family fits the anatomy. Neck angulation of 65° puts three of the four device families out of range; only the Gore Excluder Conformable fits.

> Measurements seeded into study 299103 via `docker/seed-synthetic.py`. Demo runs end-to-end against local stack.

---

## Setup

Ensure you are logged in (continues from Demo 1):

```bash
astute auth login
```

---

## Step 1 — Identify the pre-op study

```bash
astute study list 299001 --format table
```

**Output:**
```
studyId     patientId     scanDate                  anatomy     prepost     status
--------------------------------------------------------------------------------------
299103      299001        2023-01-20                aaa         pre-op      A1M
```

**What to say:** "We're looking at study 299103 — the January 2023 scan that triggered the threshold crossing. This is the study we'll run the IFU envelope check against."

---

## Step 2 — Run the IFU envelope check

```bash
astute ifu check 299103 --format table
```

**Expected output:**
```
family                      param                       value     bound       result
--------------------------------------------------------------------------------------
Endurant IIs                neck diameter               24        19–32 mm    PASS
Endurant IIs                neck diameter               24        19–32 mm    PASS
Endurant IIs                neck length                 12        ≥10 mm      PASS
Endurant IIs                neck angle (infrarenal)     65        ≤60°        FAIL
Endurant IIs                iliac diameter              12        8–25 mm     PASS
Endurant IIs                iliac diameter              12        8–25 mm     PASS
Gore Excluder (standard)    neck diameter               24        19–32 mm    PASS
Gore Excluder (standard)    neck diameter               24        19–32 mm    PASS
Gore Excluder (standard)    neck length                 12        ≥15 mm      FAIL
Gore Excluder (standard)    neck angle (infrarenal)     65        ≤60°        FAIL
Gore Excluder (standard)    iliac diameter              12        8–25 mm     PASS
Gore Excluder (standard)    iliac diameter              12        8–25 mm     PASS
Gore Excluder Conformable   neck diameter               24        16–32 mm    PASS
Gore Excluder Conformable   neck diameter               24        16–32 mm    PASS
Gore Excluder Conformable   neck length                 12        ≥10 mm      PASS
Gore Excluder Conformable   neck angle (infrarenal)     65        ≤90°        PASS
Gore Excluder Conformable   iliac diameter              12        8–25 mm     PASS
Gore Excluder Conformable   iliac diameter              12        8–25 mm     PASS
Cook Zenith Flex            neck diameter               24        20–26 mm    PASS
Cook Zenith Flex            neck diameter               24        20–26 mm    PASS
Cook Zenith Flex            neck length                 12        ≥15 mm      FAIL
Cook Zenith Flex            neck angle (infrarenal)     65        ≤60°        FAIL
Cook Zenith Flex            neck angle (suprarenal)     40        ≤45°        PASS
Cook Zenith Flex            iliac diameter              12        7.5–20 mm   PASS
Cook Zenith Flex            iliac diameter              12        7.5–20 mm   PASS
```

**What to say:** "Neck angle is 65°. Standard angulation limits are 60° — that eliminates the Endurant, standard Excluder, and Zenith Flex immediately. The Conformable's extended tolerance of 90° is the differentiator here. Short neck length at 12mm also eliminates the standard Excluder and Zenith. Gore Excluder Conformable is the only device that fits this anatomy."

---

## Step 3 — Render the EVAR planning widget in ChatGPT

In ChatGPT (with the Astute MCP connected), type:

> Run an IFU envelope check for study 299103 for patient 299001. Which device families fit this patient's anatomy?

**Expected widget:** The EVAR Planning widget renders a PASS/FAIL table for all four device families with the failing parameters highlighted and IFU citations shown inline.

**What to say:** "The agent calls the IFU check tool, gets back structured pass/fail results, and renders the planning widget. It cites the specific IFU criterion that disqualifies each device. The operating surgeon can see at a glance that only the Conformable fits — and why."

---

## Clinical talking points

- Neck angulation is the most common anatomic disqualifier in EVAR planning.
- The Gore Excluder Conformable's 90° angulation tolerance versus the standard 60° is a real clinical differentiator.
- Short neck length (12mm vs ≥15mm for Gore Std and Zenith) is a second independent exclusion.
- All IFU thresholds are sourced directly from manufacturer IFU documents, cited per row.

---

## Data seeding

Measurements for study 299103 are embedded in `docker/seed-synthetic.py` via `make_rpl_pre_op_ifu()` and uploaded to the Azurite blob store on `python3 docker/seed-synthetic.py`. Re-run the seeder after any stack reset to restore them.
