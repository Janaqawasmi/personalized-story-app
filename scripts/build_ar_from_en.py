#!/usr/bin/env python3
"""Rebuild client/src/i18n/translations/ar.json from en.json (EN→MSA Arabic).

Uses Google Translate via `deep-translator`, batching multiple strings per request.
Preserves `{placeholder}` tokens and the DAMMAH name.
"""

from __future__ import annotations

import json
import re
import time
from pathlib import Path

from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parents[1]
EN_PATH = ROOT / "client" / "src" / "i18n" / "translations" / "en.json"
AR_PATH = ROOT / "client" / "src" / "i18n" / "translations" / "ar.json"

_PLACEHOLDER_RE = re.compile(r"\{[a-zA-Z_]+\}")
_SIMPLE_NUM_RE = re.compile(r"^[\d\s\.\+\-\%°,]+$")

FORCE_AS_IS_EXACT = {
    "© DAMMAH — All rights reserved",
}

FORCE_AS_IS_STRIP = {
    "DAMMAH",
    "CBT",
    "ADHD",
    "PDF",
    "RTL",
    "ILS",
    "Firebase",
    "Firestore",
}

translator = GoogleTranslator(source="en", target="ar")

BATCH_SEP = "\n⟨⟨⟨DMSPLIT⟩⟩⟩\n"
CHUNK_SIZE = 12


def _shield_ph(s: str) -> tuple[str, dict[str, str]]:
    mapping: dict[str, str] = {}

    def _sub(m: re.Match[str]) -> str:
        token = f"⟨⟨⟨PH{len(mapping)}⟩⟩⟩"
        mapping[token] = m.group(0)
        return token

    return _PLACEHOLDER_RE.sub(_sub, s), mapping


def _unshield_ph(s: str, mapping: dict[str, str]) -> str:
    for token, raw in mapping.items():
        s = s.replace(token, raw)
    return s


def should_skip_translation(text: str):
    if text in FORCE_AS_IS_EXACT:
        return text
    stripped = text.strip()
    if stripped in FORCE_AS_IS_STRIP and len(text) <= 16:
        return text
    if "עברית" in text and len(text) <= 20:
        return text
    if _SIMPLE_NUM_RE.match(stripped) and "vs" not in stripped.lower():
        return text
    return None


def translate_single(t: str) -> str:
    for attempt in range(6):
        try:
            sh, m = _shield_ph(t)
            sh = sh.replace("DAMMAH", "DAMMAH")
            one = translator.translate(sh)
            return _unshield_ph(one, m).replace("DAMMAH", "DAMMAH")
        except Exception:
            time.sleep(1.3 * (attempt + 1))
    raise RuntimeError(f"Translation failed for: {t[:160]!r}")


def translate_non_skipped(texts: list[str]) -> list[str]:
    if not texts:
        return []

    bundle_parts: list[str] = []
    ph_maps: list[dict[str, str]] = []
    for t in texts:
        sh, m = _shield_ph(t)
        sh = sh.replace("DAMMAH", "DAMMAH")
        bundle_parts.append(sh)
        ph_maps.append(m)

    bundle = BATCH_SEP.join(bundle_parts)

    translated_bundle = None
    for attempt in range(6):
        try:
            translated_bundle = translator.translate(bundle)
            break
        except Exception:
            time.sleep(1.5 * (attempt + 1))
    if translated_bundle is None:
        return [translate_single(t) for t in texts]

    raw_parts = translated_bundle.split(BATCH_SEP.strip())
    if len(raw_parts) != len(texts):
        raw_parts = [p.strip() for p in translated_bundle.split("⟨⟨⟨DMSPLIT⟩⟩⟩")]
    if len(raw_parts) != len(texts):
        return [translate_single(t) for t in texts]

    result: list[str] = []
    for raw, phm in zip(raw_parts, ph_maps, strict=True):
        out = _unshield_ph(raw, phm).replace("DAMMAH", "DAMMAH")
        result.append(out)
    return result


def translate_chunk(texts: list[str]) -> list[str]:
    results: list[str | None] = [None] * len(texts)
    need_idx: list[int] = []
    need_vals: list[str] = []

    for i, t in enumerate(texts):
        sk = should_skip_translation(t)
        if sk is not None:
            results[i] = sk
        else:
            need_idx.append(i)
            need_vals.append(t)

    if need_vals:
        outs = translate_non_skipped(need_vals)
        for idx, out in zip(need_idx, outs, strict=True):
            results[idx] = out

    return [r for r in results if r is not None]


def collect_strings(obj, out: list[str]) -> None:
    if isinstance(obj, dict):
        for v in obj.values():
            collect_strings(v, out)
    elif isinstance(obj, list):
        for v in obj:
            collect_strings(v, out)
    elif isinstance(obj, str):
        out.append(obj)


def unique_preserve_order(seq: list[str]) -> list[str]:
    seen: set[str] = set()
    u: list[str] = []
    for s in seq:
        if s not in seen:
            seen.add(s)
            u.append(s)
    return u


def apply_map(obj, m: dict[str, str]):
    if isinstance(obj, dict):
        return {k: apply_map(v, m) for k, v in obj.items()}
    if isinstance(obj, list):
        return [apply_map(v, m) for v in obj]
    if isinstance(obj, str):
        return m[obj]
    return obj


def main() -> int:
    en = json.loads(EN_PATH.read_text(encoding="utf-8"))
    all_strs: list[str] = []
    collect_strings(en, all_strs)
    uniq = unique_preserve_order(all_strs)

    mapping: dict[str, str] = {}
    total_chunks = (len(uniq) + CHUNK_SIZE - 1) // CHUNK_SIZE
    for i in range(0, len(uniq), CHUNK_SIZE):
        chunk = uniq[i : i + CHUNK_SIZE]
        print(f"translate chunk {i // CHUNK_SIZE + 1}/{total_chunks} …", flush=True)
        outs = translate_chunk(chunk)
        for src, dst in zip(chunk, outs, strict=True):
            mapping[src] = dst
        time.sleep(0.12)

    ar = apply_map(en, mapping)
    AR_PATH.write_text(json.dumps(ar, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {AR_PATH} unique={len(uniq)}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
