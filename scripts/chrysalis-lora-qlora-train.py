#!/usr/bin/env python3
"""IS-T2 QLoRA train entry — in-repo Horizon C loop (operator GPU VM).

Dry-run (default): validate manifest + dataset; no torch required.
Real train: requires torch, transformers, peft, datasets, accelerate, bitsandbytes on GPU VM.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


def load_manifest(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("kind") != "chrysalis.web-llm.lora-train-manifest":
        raise SystemExit(f"manifest kind mismatch: {data.get('kind')}")
    return data


def validate(manifest: dict, dataset_path: Path) -> None:
    if manifest.get("shardCount", 0) < 1:
        raise SystemExit("manifest shardCount < 1")
    if manifest.get("verifyGreenCount", 0) < 1:
        raise SystemExit("manifest verifyGreenCount < 1")
    if not dataset_path.is_file():
        raise SystemExit(f"missing dataset: {dataset_path}")


def dry_run_report(manifest: dict, output: Path) -> None:
    print(
        json.dumps(
            {
                "kind": "chrysalis.web-llm.lora-train-dry-run",
                "baseModel": manifest.get("baseModel"),
                "shardCount": manifest.get("shardCount"),
                "verifyGreenCount": manifest.get("verifyGreenCount"),
                "outputDir": str(output),
                "dryRun": True,
            },
            indent=2,
        )
    )


def run_train(manifest: dict, dataset_path: Path, output: Path, max_steps: int) -> None:
    try:
        import torch  # noqa: F401
        from datasets import load_dataset  # noqa: F401
        from peft import LoraConfig, get_peft_model  # noqa: F401
        from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, Trainer  # noqa: F401
    except ImportError as exc:
        raise SystemExit(
            "Missing GPU train deps. On chrysalis-gpu-lab:\n"
            "  pip install torch transformers peft datasets accelerate bitsandbytes\n"
            f"Import error: {exc}"
        ) from exc

    base = manifest["baseModel"]
    print(f"[chrysalis-lora-qlora-train] loading base model {base}")
    tokenizer = AutoTokenizer.from_pretrained(base, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        base,
        device_map="auto",
        trust_remote_code=True,
        load_in_4bit=True,
    )
    lora = LoraConfig(r=8, lora_alpha=16, lora_dropout=0.05, bias="none", task_type="CAUSAL_LM")
    model = get_peft_model(model, lora)

    ds = load_dataset("json", data_files=str(dataset_path), split="train")

    def fmt(row):
        prompt = row.get("prompt") or row.get("input") or ""
        completion = row.get("completion") or row.get("output") or ""
        text = f"{prompt}\n{completion}"
        return tokenizer(text, truncation=True, max_length=512)

    tokenized = ds.map(fmt, remove_columns=ds.column_names)
    output.mkdir(parents=True, exist_ok=True)
    args = TrainingArguments(
        output_dir=str(output),
        per_device_train_batch_size=1,
        gradient_accumulation_steps=4,
        max_steps=max_steps,
        logging_steps=10,
        save_steps=max_steps,
        report_to=[],
    )
    trainer = Trainer(model=model, args=args, train_dataset=tokenized)
    trainer.train()
    model.save_pretrained(str(output / "adapter"))
    tokenizer.save_pretrained(str(output / "adapter"))
    print(f"[chrysalis-lora-qlora-train] adapter saved to {output / 'adapter'}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Chrysalis IS-T2 QLoRA train")
    parser.add_argument("--manifest", required=True, help="train-manifest.v1.json path")
    parser.add_argument("--output", default=None, help="adapter output directory")
    parser.add_argument("--dry-run", action="store_true", help="validate only")
    parser.add_argument("--max-steps", type=int, default=int(os.environ.get("CHRYSALIS_LORA_TRAIN_MAX_STEPS", "20")))
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    manifest = load_manifest(manifest_path)
    dataset_path = Path(manifest.get("datasetJsonlPath", ""))
    output = Path(args.output or manifest.get("outputDir", "reports/web-llm/lora/adapter"))
    validate(manifest, dataset_path)

    dry = args.dry_run or os.environ.get("CHRYSALIS_GPU_LAB_DRY_RUN", "1") != "0"
    if dry:
        dry_run_report(manifest, output)
        return

    run_train(manifest, dataset_path, output, args.max_steps)


if __name__ == "__main__":
    main()
