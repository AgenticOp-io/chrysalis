# GCE GPU lab (IS-T2 / Horizon C)

> **Status:** operator path (**G8610** prep, GPU lab scripts) — Phase **40 closed** 2026-07-03  
> **CPU VM:** `chrysalis-test-vm` — Migration OS, verify, IS export (unchanged)  
> **GPU VM:** `chrysalis-gpu-lab` — on/off spot T4 (~**$0.11/hr**) or L4 for IS-T2 LoRA experiments

## Why a second VM

| VM | Role | GPU |
| --- | --- | --- |
| `chrysalis-test-vm` | G8550 / G8600 / verify / WISP | **None** (e2-small) |
| `chrysalis-gpu-lab` | IS-T2 LoRA train sessions | **1× T4 spot** (default) |

Do **not** attach GPUs to the CPU test VM — keep Migration OS cheap and stable.

## Close gate (CPU)

Before spending GPU time, run the prep gate locally or on the CPU VM:

```bash
pnpm run hub:gpu-lab-close-smoke   # G9620 — manifest + orchestrator contract
pnpm run hub:is-t2-lora-prep-smoke # G8610 — same manifest path
```

## Quick start

Use the **same remote pattern as `pnpm run wisp:deploy:gce`** (`scripts/gce-wisp-local-stack-deploy.ps1` on **`chrysalis-test-vm`**):

1. **`$env:CLOUDSDK_COMPUTE_SSH_USE_OPENSSH = "True"`** — OpenSSH, not PuTTY (no popup windows; **`docs/HOW-TO.md`** §25).
2. **`gcloud compute scp`** to **`VM:chrysalis-test/...`** — never **`~/...`** on Windows (**DESIGN D412**).
3. **`gcloud compute ssh VM --command="..."`** — one non-interactive remote command; long work uses **`nohup`** on the VM (same as **`pnpm run test:gce -Detach`**).

`gpu-lab:gce` uploads artifacts to the CPU VM, then **`nohup`** runs `gce-gpu-lab-orchestrate.sh` there; that script reaches **`chrysalis-gpu-lab`** over internal GCE SSH (no Windows SSH to the GPU VM).

Do **not** use `gpu-lab:ssh` / `gpu-lab:bootstrap` / `gpu-lab:sync` from Windows.

```powershell
pnpm run gpu-lab:create
$env:CHRYSALIS_GPU_LAB_MAX_MINUTES = "15"
pnpm run gpu-lab:gce
pnpm run gpu-lab:gce:status     # milestones + adapter present (not progress-bar spam)
pnpm run test:gce:fetch         # pulls reports/ci + reports/web-llm/lora when present
```

**Default GPU zone:** `us-central1-b` (matches `chrysalis-gpu-lab`). Override with `CHRYSALIS_GPU_LAB_ZONE`.

After a real train (`CHRYSALIS_GPU_LAB_DRY_RUN=0`), the orchestrator **fetches the LoRA adapter onto the CPU VM** before stopping the GPU (billing off). Status then reports `ADAPTER_PRESENT=yes`.

If a prior run stopped the GPU before fetch, recover with `scripts/gce-gpu-lab-recover-adapter.sh` on the CPU VM (starts GPU briefly, pulls `reports/web-llm/lora/adapter`, writes `train-result.v1.json`, stops GPU).

**Reference scripts:** `gce-wisp-local-stack-deploy.ps1`, `gce-test-vm-refresh.ps1`, `gce-run-all-tests.ps1 -Detach`.

## Commands

| Script | Action |
| --- | --- |
| `gpu-lab:create` | Create spot T4 + Deep Learning VM drivers |
| `gpu-lab:start` / `gpu-lab:stop` | Billing on/off |
| `gpu-lab:status` | Instance state + external IP |
| `gpu-lab:check-quota` | Pre-flight GPU quota (fails fast before create) |
| `gpu-lab:delete` | Remove VM |
| `gpu-lab:ssh` | SSH to lab |
| `gpu-lab:prep` | Export dataset + `train-manifest.v1.json` (CPU) |
| `gpu-lab:sync` | Upload manifest + shards to lab |
| `gpu-lab:train` | Run `gce-gpu-lora-train.sh` (dry-run by default) |
| `gpu-lab:gce` | **Windows:** same as `test:gce:migration-os` — detached on CPU VM |
| `gpu-lab:gce:status` | OK / running / idle + `ADAPTER_PRESENT` + milestones (not progress-bar spam) |

**On-demand (no spot):** `powershell -File scripts/gce-gpu-lab.ps1 -Create -OnDemand`  
**L4 instead of T4:** add `-L4` to `-Create` (~$0.25–0.36/hr spot)

## Session time limit (cost guard)

Default **120 minutes** per GPU session. The lab **auto-stops the VM** when the cap is reached.

| Variable | Default | Purpose |
| --- | --- | --- |
| `CHRYSALIS_GPU_LAB_MAX_MINUTES` | `120` | Hard session cap (train + VM billing) |
| `CHRYSALIS_GPU_LAB_AUTO_STOP` | `1` | Set `0` to disable auto-stop (not recommended) |

Auto-stop is scheduled on **`gpu-lab:start`** and **`gpu-lab:train`**. On the VM, real LoRA train runs under `timeout ${MAX_MINUTES}m` when `CHRYSALIS_GPU_LAB_DRY_RUN=0`.

Example — 90-minute cap:

```powershell
$env:CHRYSALIS_GPU_LAB_MAX_MINUTES = "90"
pnpm run gpu-lab:start
pnpm run gpu-lab:train
```

## Artifacts

| Path | Purpose |
| --- | --- |
| `reports/web-llm/dataset/training-shards.v1.jsonl` | Verify-gated training shards |
| `reports/web-llm/lora/train-manifest.v1.json` | IS-T2 manifest (`chrysalis.web-llm.lora-train-manifest`) — **repo-relative posix paths** (**D6395**) |
| `reports/web-llm/lora/adapter/` | LoRA output (after real train on GPU VM) |

## Train (operator)

Default **`gpu-lab:train`** is **dry-run** (`CHRYSALIS_GPU_LAB_DRY_RUN=1`): checks `nvidia-smi`, manifest, shard count.

For a real QLoRA session on the lab VM:

1. Sync repo to lab (`pnpm run gpu-lab:sync`) or use CPU VM orchestrator (`pnpm run gpu-lab:gce`)
2. Set `CHRYSALIS_GPU_LAB_DRY_RUN=0` (train script installs torch/peft/… on first real run)
3. Optional zone override after stockout: `$env:CHRYSALIS_GPU_LAB_ZONE = "us-central1-b"`
4. Eval on **CPU** with WVB + `chrysalis verify` — models propose; WebIR + oracle + verify dispose

In-repo entry: **`scripts/chrysalis-lora-qlora-train.py`** + **`buildLoraTrainPlan`** in `@chrysalis/web-llm`. GPU deps stay on the lab VM only (**G9110** dry-run in CI).

## Stable Diffusion 1.5 (optional)

Same lab VM can run SD 1.5 via AUTOMATIC1111 or Docker after `nvidia-smi` works — **not** part of Chrysalis gates. See community GCE T4 guides.

## Quota

Project `chrysalis-dev-f5x6qv` / `us-central1`: request **GPUs (all regions)** quota if create fails with `GPUS_ALL_REGIONS` limit 0. [Quotas console](https://console.cloud.google.com/iam-admin/quotas?project=chrysalis-dev-f5x6qv&metric=compute.googleapis.com%2Fgpus_all_regions).

Image family (Deep Learning VM): `common-cu129-ubuntu-2204-nvidia-580` (`deeplearning-platform-release`).

## Gates

| Gate | Smoke |
| --- | --- |
| **G8610** | `hub:is-t2-lora-prep-smoke` (CPU only) |
| **G9110** | `hub:horizon-c-train-loop-smoke` (CPU dry-run plan) |
| **G9130** | `hub:horizon-c-train-close-smoke` (operator contract; real GPU via `gpu-lab:gce`) |

**Index:** [`INTELLIGENCE-SHORTHAND.md`](./INTELLIGENCE-SHORTHAND.md) · [`WEB-LLM-TRAINING-RECIPE.md`](./WEB-LLM-TRAINING-RECIPE.md)
