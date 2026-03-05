import argparse
import hashlib
import json
from pathlib import Path


def _load_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def _write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=True) + "\n")


def main() -> None:
    backend_root = Path(__file__).resolve().parents[2]
    data_dir = backend_root / "data" / "nlp"
    parser = argparse.ArgumentParser(description="Deterministically split JSONL dataset")
    parser.add_argument("--input", default=str(data_dir / "synthetic_v1.jsonl"))
    parser.add_argument("--train", default=str(data_dir / "train.jsonl"))
    parser.add_argument("--val", default=str(data_dir / "val.jsonl"))
    parser.add_argument("--test", default=str(data_dir / "test.jsonl"))
    parser.add_argument("--report", default=str(data_dir / "dataset_report.json"))
    parser.add_argument("--train-size", type=int, default=1600)
    parser.add_argument("--val-size", type=int, default=200)
    parser.add_argument("--test-size", type=int, default=200)
    args = parser.parse_args()

    rows = _load_jsonl(Path(args.input))

    expected_total = args.train_size + args.val_size + args.test_size
    if len(rows) != expected_total:
        raise ValueError(
            f"Input row count {len(rows)} does not match requested split total {expected_total}"
        )

    keyed_rows: list[tuple[str, dict]] = []
    for row in rows:
        sample_id = row.get("sample_id")
        if not isinstance(sample_id, str) or not sample_id:
            raise ValueError("Each row requires a non-empty sample_id")
        digest = hashlib.sha256(sample_id.encode("utf-8")).hexdigest()
        keyed_rows.append((digest, row))

    keyed_rows.sort(key=lambda item: item[0])
    ordered_rows = [row for _, row in keyed_rows]

    train_rows = ordered_rows[: args.train_size]
    val_rows = ordered_rows[args.train_size : args.train_size + args.val_size]
    test_rows = ordered_rows[args.train_size + args.val_size :]

    _write_jsonl(Path(args.train), train_rows)
    _write_jsonl(Path(args.val), val_rows)
    _write_jsonl(Path(args.test), test_rows)

    report_path = Path(args.report)
    report: dict = {}
    if report_path.exists():
        report = json.loads(report_path.read_text(encoding="utf-8"))
    report["split_counts"] = {
        "train": len(train_rows),
        "val": len(val_rows),
        "test": len(test_rows),
    }
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"train={len(train_rows)} val={len(val_rows)} test={len(test_rows)} total={len(rows)}")


if __name__ == "__main__":
    main()
