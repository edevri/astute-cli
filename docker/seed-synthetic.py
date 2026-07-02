#!/usr/bin/env python3
"""
Seed synthetic test data for local astute-cli dev stack.

Creates:
  - 1 patient (sex=1 male) associated with afouad
  - 3 pre-op studies at different scan dates (growth arc: 42 → 48 → 55 mm)
  - 2 post-op studies at different scan dates (surveillance: 50 → 58 mm + endoleak)

Run from repos/astute-cli/:
  python3 docker/seed-synthetic.py

Requires: azure-storage-blob psycopg2-binary
  pip install azure-storage-blob psycopg2-binary
"""

import psycopg2
from azure.storage.blob import BlobServiceClient
from azure.core.credentials import AzureNamedKeyCredential
from datetime import date

# ── Config ────────────────────────────────────────────────────────────────────

DB_URL      = "postgresql://postgres:f**b%40ll@localhost:5432/mms_matrix"
AZURITE_URL = "http://localhost:10000/devstoreaccount1"
AZURITE_KEY = "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw=="
AZURITE_ACCT= "devstoreaccount1"

PHYSICIAN_ID = 197297  # afouad

# ── Synthetic data ────────────────────────────────────────────────────────────

PATIENT = {
    "patient_id": 299001,
    "first_name": "Synthia",
    "last_name":  "TestAAA",
    "sex": 1,               # 1=male (affects repair threshold 5.5cm vs 5.0cm)
    "date_of_birth": date(1945, 3, 15),
}

# Pre-op studies — growth arc crossing accelerated-growth threshold (>5mm/6mo)
PRE_OP_STUDIES = [
    {"modelno": 299101, "scandate": date(2022, 1, 10), "sac_mm": 42.0},
    {"modelno": 299102, "scandate": date(2022, 7, 15), "sac_mm": 48.5},  # +6.5mm in 6mo → accelerated
    {"modelno": 299103, "scandate": date(2023, 1, 20), "sac_mm": 55.2},  # crosses 5.5cm threshold
]

# Post-op studies — sac expansion + endoleak
POST_OP_STUDIES = [
    {"modelno": 299201, "scandate": date(2023, 6, 1),  "sac_mm": 50.0, "endoleak_cc": 0.0},
    {"modelno": 299202, "scandate": date(2024, 1, 15), "sac_mm": 57.3, "endoleak_cc": 1850.0},  # +7.3mm, endoleak
]

# ── RPL generation ────────────────────────────────────────────────────────────

def make_rpl_pre_op(study_id: int, protocol: str, sac_mm: float) -> str:
    return f"""#
#  Plan Document written by Razz 1.19.7
#  Synthetic seed data
#
#     ModelNo:   {study_id}
#     Protocol:  {protocol}
#     Modeler:
#     Host:
#

global _PLAN_DOC
set _PLAN_DOC(Version)  v2
set _PLAN_DOC(modelNo)  {{{study_id}}}
set _PLAN_DOC(protocol) {{{protocol}}}
#
set _PLAN_DOC(no) 0
#
set _PLAN_DOC($_PLAN_DOC(no),calcType)      {{Distance}}
set _PLAN_DOC($_PLAN_DOC(no),name)          {{max sac diameter}}
set _PLAN_DOC($_PLAN_DOC(no),rgb)           {{1.0 0.0 0.0}}
set _PLAN_DOC($_PLAN_DOC(no),comment)       {{}}
set _PLAN_DOC($_PLAN_DOC(no),Visible)       {{1}}
set _PLAN_DOC($_PLAN_DOC(no),Trans)         {{0}}
set _PLAN_DOC($_PLAN_DOC(no),TransLevel)    {{0}}
set _PLAN_DOC($_PLAN_DOC(no),Value)         {{{sac_mm}}}
set _PLAN_DOC($_PLAN_DOC(no),mark1)         {{}}
set _PLAN_DOC($_PLAN_DOC(no),mark2)         {{}}
set _PLAN_DOC($_PLAN_DOC(no),calcModelType) {{oblique}}
set _PLAN_DOC($_PLAN_DOC(no),tubeSides)     {{36}}
set _PLAN_DOC($_PLAN_DOC(no),display_name)  {{Max Sac Diameter}}
set _PLAN_DOC($_PLAN_DOC(no),unit)          {{mm}}
incr _PLAN_DOC(no)
"""


def make_rpl_post_op(study_id: int, protocol: str, sac_mm: float, endoleak_cc: float) -> str:
    return f"""#
#  Plan Document written by Razz 1.19.7
#  Synthetic seed data
#
#     ModelNo:   {study_id}
#     Protocol:  {protocol}
#     Modeler:
#     Host:
#

global _PLAN_DOC
set _PLAN_DOC(Version)  v2
set _PLAN_DOC(modelNo)  {{{study_id}}}
set _PLAN_DOC(protocol) {{{protocol}}}
#
set _PLAN_DOC(no) 0
#
set _PLAN_DOC($_PLAN_DOC(no),calcType)      {{Distance}}
set _PLAN_DOC($_PLAN_DOC(no),name)          {{max sac diameter}}
set _PLAN_DOC($_PLAN_DOC(no),rgb)           {{1.0 0.0 0.0}}
set _PLAN_DOC($_PLAN_DOC(no),comment)       {{}}
set _PLAN_DOC($_PLAN_DOC(no),Visible)       {{1}}
set _PLAN_DOC($_PLAN_DOC(no),Trans)         {{0}}
set _PLAN_DOC($_PLAN_DOC(no),TransLevel)    {{0}}
set _PLAN_DOC($_PLAN_DOC(no),Value)         {{{sac_mm}}}
set _PLAN_DOC($_PLAN_DOC(no),mark1)         {{}}
set _PLAN_DOC($_PLAN_DOC(no),mark2)         {{}}
set _PLAN_DOC($_PLAN_DOC(no),calcModelType) {{oblique}}
set _PLAN_DOC($_PLAN_DOC(no),tubeSides)     {{36}}
set _PLAN_DOC($_PLAN_DOC(no),display_name)  {{Max Sac Diameter}}
set _PLAN_DOC($_PLAN_DOC(no),unit)          {{mm}}
incr _PLAN_DOC(no)
#
set _PLAN_DOC($_PLAN_DOC(no),calcType)      {{Volume}}
set _PLAN_DOC($_PLAN_DOC(no),name)          {{endo vol to ao bifur}}
set _PLAN_DOC($_PLAN_DOC(no),rgb)           {{0.0 1.0 0.0}}
set _PLAN_DOC($_PLAN_DOC(no),comment)       {{}}
set _PLAN_DOC($_PLAN_DOC(no),Visible)       {{1}}
set _PLAN_DOC($_PLAN_DOC(no),Trans)         {{0}}
set _PLAN_DOC($_PLAN_DOC(no),TransLevel)    {{0}}
set _PLAN_DOC($_PLAN_DOC(no),Value)         {{{endoleak_cc}}}
set _PLAN_DOC($_PLAN_DOC(no),slice1)        {{0}}
set _PLAN_DOC($_PLAN_DOC(no),slice2)        {{0}}
set _PLAN_DOC($_PLAN_DOC(no),volumeObject)  {{}}
set _PLAN_DOC($_PLAN_DOC(no),display_name)  {{Endo Vol to Ao Bifur}}
set _PLAN_DOC($_PLAN_DOC(no),unit)          {{cc}}
incr _PLAN_DOC(no)
"""


def blob_path(study_id: int, protocol: str) -> str:
    bucket = 1000 * (study_id // 1000)
    return f"{bucket}/{study_id}/system/plans/{study_id}-{protocol}.rpl"


# ── Main ──────────────────────────────────────────────────────────────────────

def seed_db(conn):
    with conn.cursor() as cur:
        # Patient
        cur.execute("""
            INSERT INTO patients (patient_id, first_name, last_name, sex, date_of_birth)
            VALUES (%(patient_id)s, %(first_name)s, %(last_name)s, %(sex)s, %(date_of_birth)s)
            ON CONFLICT (patient_id) DO NOTHING
        """, PATIENT)

        # Physician association
        cur.execute("""
            INSERT INTO physician_patient_associations (physician_id, patient_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
        """, (PHYSICIAN_ID, PATIENT["patient_id"]))

        # Pre-op studies
        for s in PRE_OP_STUDIES:
            cur.execute("""
                INSERT INTO old_studies (modelno, patient_id, scandate, anatomy, prepost, status, surveillance_measurements)
                VALUES (%s, %s, %s, 'aaa', 'pre-op', 'A1M', '2')
                ON CONFLICT (modelno) DO NOTHING
            """, (s["modelno"], PATIENT["patient_id"], s["scandate"]))

        # Post-op studies
        for s in POST_OP_STUDIES:
            cur.execute("""
                INSERT INTO old_studies (modelno, patient_id, scandate, anatomy, prepost, status, surveillance_measurements)
                VALUES (%s, %s, %s, 'aaa', 'post-op', 'A1M', '2')
                ON CONFLICT (modelno) DO NOTHING
            """, (s["modelno"], PATIENT["patient_id"], s["scandate"]))

    conn.commit()
    print("✓ DB seeded")


def seed_blobs(blob_service: BlobServiceClient):
    container = blob_service.get_container_client("studies")
    try:
        container.create_container()
    except Exception:
        pass  # already exists

    for s in PRE_OP_STUDIES:
        protocol = "MMS-SRV-pre-op"
        content = make_rpl_pre_op(s["modelno"], protocol, s["sac_mm"])
        path = blob_path(s["modelno"], protocol)
        container.upload_blob(path, content.encode(), overwrite=True)
        print(f"✓ blob: {path}")

    for s in POST_OP_STUDIES:
        protocol = "MMS-SRV-post"
        content = make_rpl_post_op(s["modelno"], protocol, s["sac_mm"], s["endoleak_cc"])
        path = blob_path(s["modelno"], protocol)
        container.upload_blob(path, content.encode(), overwrite=True)
        print(f"✓ blob: {path}")


if __name__ == "__main__":
    print("Seeding DB...")
    conn = psycopg2.connect(DB_URL)
    seed_db(conn)
    conn.close()

    print("Seeding Azurite blobs...")
    cred = AzureNamedKeyCredential(name=AZURITE_ACCT, key=AZURITE_KEY)
    blob_service = BlobServiceClient(account_url=AZURITE_URL, credential=cred)
    seed_blobs(blob_service)

    print()
    print("Done. Test with:")
    print(f"  astute patient list             # should include patientId 299001")
    print(f"  astute study list 299001")
    print(f"  astute growth 299001            # 3 points, accelerated growth flag")
    print(f"  astute surveillance 299001      # 2 post-op studies, sacExpansionConcerning + endoleakPresent")
