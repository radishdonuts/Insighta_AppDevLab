#!/usr/bin/env python3
"""Sync Insighta NLP dataset + pinned artifact run from a public Google Drive folder link.

Example:
python backend/scripts/nlp/sync_from_drive_link.py ^
  --folder-url "https://drive.google.com/drive/folders/1CedqRQrTL_VZPPL6FJRv3dTxVHkBXJSE?usp=sharing" ^
  --run-id "distilbert_complaint_twohead_20260305_030951"
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

REQUIRED_DATA_FILES = ["train.jsonl", "val.jsonl", "test.jsonl"]
REQUIRED_ARTIFACT_FILES = [
    "label_maps_categoryName.json",
    "label_maps_priority.json",
    "nlp_priority_rules.json",
    "inference_config.json",
]
OPTIONAL_ARTIFACT_FILES = [
    "training_summary.json",
    "classification_reports.json",
    "confusion_matrices.json",
]


def _find_insighta_root(download_dir: Path) -> Path:
    if (download_dir / "backend" / "artifacts").is_dir() and (download_dir / "backend" / "data" / "nlp").is_dir():
        return download_dir

    if (download_dir / "artifacts").is_dir() and (download_dir / "data" / "nlp").is_dir():
        return download_dir

    direct = download_dir / "Insighta"
    if (direct / "backend" / "artifacts").is_dir() and (direct / "backend" / "data" / "nlp").is_dir():
        return direct
    if (direct / "artifacts").is_dir() and (direct / "data" / "nlp").is_dir():
        return direct

    for path in download_dir.rglob("*"):
        if not path.is_dir():
            continue
        if (path / "backend" / "artifacts").is_dir() and (path / "backend" / "data" / "nlp").is_dir():
            return path
        if (path / "artifacts").is_dir() and (path / "data" / "nlp").is_dir():
            return path

    raise FileNotFoundError(
        f"Could not locate Insighta root under {download_dir}. Expected backend/artifacts + backend/data/nlp or artifacts + data/nlp."
    )


def _copy_data(src_data_dir: Path, dst_data_dir: Path) -> None:
    dst_data_dir.mkdir(parents=True, exist_ok=True)
    missing = [name for name in REQUIRED_DATA_FILES if not (src_data_dir / name).exists()]
    if missing:
        raise FileNotFoundError(f"Missing dataset files in Drive download: {', '.join(missing)}")

    for name in REQUIRED_DATA_FILES:
        src = src_data_dir / name
        dst = dst_data_dir / name
        shutil.copy2(src, dst)
        print(f"[sync:data] {src} -> {dst}")


def _copy_artifacts(src_artifact_run: Path, dst_artifact_run: Path) -> None:
    if not (src_artifact_run / "model").is_dir():
        raise FileNotFoundError(f"Missing model directory: {src_artifact_run / 'model'}")

    missing = [name for name in REQUIRED_ARTIFACT_FILES if not (src_artifact_run / name).exists()]
    if missing:
        raise FileNotFoundError(f"Missing artifact files: {', '.join(missing)}")

    if dst_artifact_run.exists():
        shutil.rmtree(dst_artifact_run)
    dst_artifact_run.mkdir(parents=True, exist_ok=True)

    shutil.copytree(src_artifact_run / "model", dst_artifact_run / "model")
    print(f"[sync:artifact] {src_artifact_run / 'model'} -> {dst_artifact_run / 'model'}")

    for name in REQUIRED_ARTIFACT_FILES:
        src = src_artifact_run / name
        dst = dst_artifact_run / name
        shutil.copy2(src, dst)
        print(f"[sync:artifact] {src} -> {dst}")

    for name in OPTIONAL_ARTIFACT_FILES:
        src = src_artifact_run / name
        if not src.exists():
            continue
        dst = dst_artifact_run / name
        shutil.copy2(src, dst)
        print(f"[sync:artifact] {src} -> {dst}")


def main() -> int:
    script_dir = Path(__file__).resolve().parent
    backend_root_default = script_dir.parent.parent

    parser = argparse.ArgumentParser(description="Sync Insighta data/artifacts from a public Google Drive folder URL.")
    parser.add_argument("--folder-url", required=True, help="Google Drive shared folder URL")
    parser.add_argument("--run-id", required=True, help="Pinned artifact run folder name")
    parser.add_argument("--backend-root", default=str(backend_root_default), help="Backend root path")
    parser.add_argument("--download-dir", default=".cache/drive_sync", help="Temp download directory under backend root")
    parser.add_argument(
        "--artifact-dir",
        default="artifacts",
        help="Artifact directory under backend root",
    )
    args = parser.parse_args()

    backend_root = Path(args.backend_root).resolve()
    download_dir = (backend_root / args.download_dir).resolve()
    artifact_dir = (backend_root / args.artifact_dir).resolve()

    print(f"[sync] backend_root={backend_root}")
    print(f"[sync] download_dir={download_dir}")
    print(f"[sync] artifact_dir={artifact_dir}")

    download_dir.mkdir(parents=True, exist_ok=True)

    try:
        import gdown
    except Exception as exc:
        print(f"ERROR: gdown is required. Install with: pip install gdown\n{exc}")
        return 2

    print("[sync] downloading shared Drive folder...")
    gdown.download_folder(
        url=args.folder_url,
        output=str(download_dir),
        quiet=False,
        use_cookies=False,
        remaining_ok=True,
    )

    insighta_root = _find_insighta_root(download_dir)
    print(f"[sync] found Insighta root: {insighta_root}")

    src_data_dir = insighta_root / "backend" / "data" / "nlp"
    if not src_data_dir.is_dir():
        src_data_dir = insighta_root / "data" / "nlp"
    dst_data_dir = backend_root / "data" / "nlp"
    _copy_data(src_data_dir, dst_data_dir)

    src_artifact_base = insighta_root / "backend" / "artifacts"
    if not src_artifact_base.is_dir():
        src_artifact_base = insighta_root / "artifacts"
    src_artifact_run = src_artifact_base / args.run_id
    if not src_artifact_run.exists():
        raise FileNotFoundError(f"Pinned run ID not found in downloaded artifacts: {src_artifact_run}")

    dst_artifact_run = artifact_dir / args.run_id
    artifact_dir.mkdir(parents=True, exist_ok=True)
    _copy_artifacts(src_artifact_run, dst_artifact_run)

    print("\n[sync] done.")
    print(f"Set backend env: NLP_ARTIFACT_DIR={dst_artifact_run}")
    print(f"Optional: NLP_ARTIFACT_RUN_ID={args.run_id}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}")
        raise SystemExit(1)
