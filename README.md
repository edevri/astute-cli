# astute-cli

CLI + core library monorepo for the Astute Agent Platform.

## Packages

| Package | Description |
|---------|-------------|
| `packages/astute-core` | Shared capability library; imported by the CLI and `mcp-cli` |
| `packages/astute-cli` | `astute` binary — thin wrapper over astute-core |

---

## Local development setup

### 1. Container runtime — Colima (replaces Docker Desktop)

Colima is already installed. Start it once per machine (it persists across reboots with `--vm-type vz`):

```sh
colima start --cpu 4 --memory 8 --disk 60 --vm-type vz
```

> Colima provides the Docker socket, so `docker` and `docker compose` work unchanged. Drop `--vm-type vz` if you need it to fall back to QEMU.

Check status anytime: `colima status`

### 2. Install dependencies

```sh
npm install
```

### 3. Build all packages

```sh
npm run build
```

### 4. Link the `astute` binary globally

Run this once after the initial build, and again after any TypeScript change that affects `packages/astute-cli`:

```sh
cd packages/astute-cli
npm link
cd ../..
```

After linking, `astute` is available from any directory:

```sh
astute --help
```

### 5. Point Docker at Colima (once per machine)

```sh
docker context create colima --docker "host=unix://$HOME/.colima/default/docker.sock"
docker context use colima
```

### 6. Start the local stack (everyday command)

Build images once (takes a few minutes — builds 10+ Python services + bff-cli):

```sh
./docker/build.sh
```

Then start:

```sh
colima start          # if not already running

# IMPORTANT: run docker compose from the real USB path, not a symlink.
# Colima's virtiofs cannot follow host symlinks that cross mount boundaries.
cd /Volumes/edevri-usb/git-ubuntu/astute/preview/repos/astute-cli
docker compose up -d
```

Re-run `./docker/build.sh` only when service source changes. Infrastructure images (postgres, redis, azurite) are pulled from the registry and don't need rebuilding.

Services: postgres (5432), redis (6379), azurite (blob storage), auth, user, organization, patient, study, protocol, storage-azure, calc, mark, bff-cli (8080).

### 7. Authenticate

```sh
astute auth login
```

Credentials for the local stack: `afouad` / `test1234`

### 8. Seed synthetic test data (run after every full stack restart)

The DB dump has studies but no measurement records, so `astute growth` and `astute surveillance` return empty results against real DB data. Run the seed script once to create a synthetic patient with complete data:

```sh
# Requires: azure-storage-blob psycopg2-binary
pip3 install azure-storage-blob psycopg2-binary --break-system-packages

python3 docker/seed-synthetic.py
```

This fixes auth (afouad password + OTP), inserts synthetic patients/studies, and uploads `.rpl` measurement files to Azurite. It is idempotent — safe to re-run. **Must be re-run whenever `preview-sql` is recreated** (the DB has no persistent volume, so data resets on container restart).

**What gets created:**

| patientId | studies | scenario |
|-----------|---------|----------|
| 299001 | 3 pre-op (Jan 2022 → Jul 2022 → Jan 2023) | Growth arc: 42 → 48.5 → 55.2 mm — accelerated growth + repair threshold crossed |
| 299001 | 2 post-op (Jun 2023 → Jan 2024) | Sac expansion: 50 → 57.3 mm (>5 mm) + endoleak present |

**Verify:**

```sh
astute study list 299001
astute growth 299001        # should show 3 points, acceleratedGrowth: true, repairThresholdCrossed: true
astute surveillance 299001  # should show 2 points, sacExpansionConcerning: true, endoleakPresent: true
```

> The seed script bypasses the storage service and writes blobs directly to Azurite. Clinical values are not accurate — use this only for technical verification of the pipeline.

---

## Development workflow

After editing TypeScript in either package, rebuild and re-link:

```sh
npm run build
cd packages/astute-cli && npm link && cd ../..
```

Or build a single package:

```sh
npm run build -w packages/astute-cli
```
