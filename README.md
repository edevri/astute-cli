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

### 6. Start the local stack

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

### 6. Authenticate

```sh
astute auth login
```

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
