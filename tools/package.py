"""Build a Chrome Web Store upload ZIP containing only the runtime files.

Excludes dev artifacts (tools/, filters/, recon provenance, README, the SVG
source, the 512px icon, git). The manifest sits at the ZIP root, as the store
requires.

Usage:
    python tools/package.py   ->  dist/betting-blocker-<version>.zip
"""
from __future__ import annotations

import json
import zipfile
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent

# Exactly the files the extension needs at runtime (everything referenced by
# manifest.json, plus the manifest itself).
RUNTIME = [
    "manifest.json",
    "background.js",
    "i18n.js",
    "blocked.html",
    "blocked.js",
    "data/packs.js",
    "data/lists.json",
    "src/engine.js",
    "rules/embedded.json",
    "rules/navigation.json",
    "options/popup.html",
    "options/options.html",
    "options/ui.js",
    "icons/icon16.png",
    "icons/icon32.png",
    "icons/icon48.png",
    "icons/icon128.png",
]


def main() -> int:
    version = json.loads((BASE / "manifest.json").read_text(encoding="utf-8"))["version"]
    dist = BASE / "dist"
    dist.mkdir(exist_ok=True)
    out = dist / f"betting-blocker-{version}.zip"

    missing = [f for f in RUNTIME if not (BASE / f).exists()]
    if missing:
        raise SystemExit(f"ERROR: missing runtime files: {missing}")

    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for rel in RUNTIME:
            z.write(BASE / rel, arcname=rel)  # arcname = path inside the zip

    size_kb = out.stat().st_size / 1024
    print(f"wrote {out.relative_to(BASE)}  ({len(RUNTIME)} files, {size_kb:.1f} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
