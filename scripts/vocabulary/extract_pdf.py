"""Bounded native geometry adapter. No OCR, network or database access.

extract_pages accepts already-decoded synthetic/native page objects; callers own
that boundary. extract_pdf is the rights-gated file entry point. Its supplied
authorization must be issued by the owning rights workflow, not by this adapter.
"""
import argparse
from contextlib import redirect_stderr, redirect_stdout
import hashlib
import io
import json
import math
import os
from pathlib import Path
import re
import sys


LEVELS = frozenset(("A1", "A2", "B1", "B2", "C1"))
MAX_SOURCE_BYTES = 64 * 1024 * 1024
MAX_PAGES = 2000
MAX_WORDS_PER_PAGE = 20000
MAX_DOCUMENT_WORDS = 1000000
HASH = re.compile(r"[a-f0-9]{64}\Z")


def _metadata(document_sha256, cefr_level):
    if not isinstance(document_sha256, str) or not HASH.fullmatch(document_sha256):
        raise ValueError("Invalid document SHA-256")
    if cefr_level not in LEVELS:
        raise ValueError("Unsupported CEFR configuration")


def _coordinate(value):
    if isinstance(value, (bool, str)):
        raise ValueError("Invalid native geometry")
    try:
        number = float(value)
    except (TypeError, ValueError, OverflowError) as error:
        raise ValueError("Invalid native geometry") from error
    if not math.isfinite(number) or number < 0:
        raise ValueError("Invalid native geometry")
    return number


def extract_pages(pages, document_sha256, cefr_level):
    """Preserve all raw words and blank pages for downstream reconciliation."""
    _metadata(document_sha256, cefr_level)
    extracted = []
    total_words = 0
    for page_index, page in enumerate(pages):
        if page_index >= MAX_PAGES:
            raise ValueError("Page limit exceeded")
        width, height = _coordinate(page.width), _coordinate(page.height)
        if not width or not height:
            raise ValueError("Invalid page geometry")
        words = []
        # Keep Unicode exactly as returned by the native decoder; no ligature
        # expansion or Unicode compatibility folding is allowed at this layer.
        for native in page.extract_words(expand_ligatures=False):
            if len(words) >= MAX_WORDS_PER_PAGE or total_words >= MAX_DOCUMENT_WORDS:
                raise ValueError("Native word limit exceeded")
            try:
                text = native["text"]
                x0, x1, top, bottom = (_coordinate(native[key]) for key in ("x0", "x1", "top", "bottom"))
            except (KeyError, TypeError) as error:
                raise ValueError("Invalid native word") from error
            if not isinstance(text, str) or not text.strip() or len(text) > 10000:
                raise ValueError("Invalid native word text")
            if x1 <= x0 or bottom <= top or x1 > width or bottom > height:
                raise ValueError("Invalid native word geometry")
            words.append(dict(text=text, x0=x0, x1=x1, top=top, bottom=bottom))
            total_words += 1
        words.sort(key=lambda word: (word["top"], word["x0"], word["bottom"], word["x1"], word["text"]))
        decoded = dict(pageIndex=page_index, width=width, height=height, words=words)
        if hasattr(page, "rects"):
            rules = []
            for rect in page.rects:
                # Decorative filled areas may bleed beyond the media box.
                # Only thin, horizontal rectangles are table-rule candidates.
                if rect["bottom"] - rect["top"] > 1:
                    continue
                x0, x1, top, bottom = (_coordinate(rect[key]) for key in ("x0", "x1", "top", "bottom"))
                if x1 < x0 or bottom < top or x1 > width or bottom > height:
                    raise ValueError("Invalid native rule geometry")
                if 0 < bottom - top <= 1 and x1 - x0 >= 10:
                    rules.append(dict(x0=x0, x1=x1, y=(top + bottom) / 2))
                if len(rules) > 20000:
                    raise ValueError("Native rule limit exceeded")
            decoded["horizontalRules"] = sorted(rules, key=lambda rule: (rule["y"], rule["x0"], rule["x1"]))
        extracted.append(decoded)
    if not extracted:
        raise ValueError("Document must contain at least one page")
    return dict(documentSha256=document_sha256, pageCount=len(extracted), cefrLevel=cefr_level, pages=extracted)


def _authorization(authorization_path, *, require_storage_permission=False):
    if authorization_path is None:
        raise PermissionError("BLOCKED_BY_RIGHTS: authorization is required")
    try:
        with Path(authorization_path).open("rb") as stream:
            encoded = stream.read(65537)
        if len(encoded) > 65536:
            raise ValueError("Authorization size limit")
        grant = json.loads(encoded)
    except (OSError, ValueError, UnicodeError) as error:
        raise PermissionError("BLOCKED_BY_RIGHTS: invalid authorization") from error
    if not isinstance(grant, dict):
        raise PermissionError("BLOCKED_BY_RIGHTS: invalid authorization")
    reference = grant.get("permissionReference")
    uses, fields = grant.get("allowedUses"), grant.get("allowedFields")
    digest = grant.get("documentSha256")
    if (grant.get("rightsStatus") != "APPROVED"
            or not isinstance(reference, str) or not reference.strip() or len(reference) > 500
            or not isinstance(uses, list) or "EXTRACT" not in uses
            or require_storage_permission and "STORE" not in uses
            or not isinstance(fields, list) or any(field not in fields for field in ("FORM", "PRONUNCIATION", "DEFINITION"))
            or not isinstance(digest, str) or not HASH.fullmatch(digest)):
        raise PermissionError("BLOCKED_BY_RIGHTS: extraction and all raw content fields require approval")
    return digest


def extract_pdf(input_path, authorization_path, cefr_level, *, require_storage_permission=False):
    """Check rights before source reads, and bind the decoder to hashed bytes."""
    expected_hash = _authorization(authorization_path, require_storage_permission=require_storage_permission)
    _metadata(expected_hash, cefr_level)
    with Path(input_path).open("rb") as stream:
        content = stream.read(MAX_SOURCE_BYTES + 1)
    if len(content) > MAX_SOURCE_BYTES:
        raise ValueError("Source byte limit exceeded")
    digest = hashlib.sha256(content).hexdigest()
    if digest != expected_hash:
        raise PermissionError("BLOCKED_BY_RIGHTS: document hash mismatch")
    # Decode the exact bytes just hashed, avoiding a path replacement race.
    import pdfplumber

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        return extract_pages(pdf.pages, digest, cefr_level)


class _CliParser(argparse.ArgumentParser):
    def error(self, message):
        # argparse normally echoes invalid argument values, which may be content.
        self.exit(2, "Invalid extraction arguments; use --help.\n")


def main(argv=None):
    """Write geometry exclusively to an explicitly named, new UTF-8 file."""
    parser = _CliParser(description="Extract authorized native PDF geometry to a new JSON file.", allow_abbrev=False)
    parser.add_argument("--input", required=True, type=Path, help="Local authorized source file")
    parser.add_argument("--authorization", required=True, type=Path, help="Document-bound rights JSON file")
    parser.add_argument("--level", required=True, choices=sorted(LEVELS), help="Source CEFR level")
    parser.add_argument("--output", required=True, type=Path, help="New geometry JSON file; existing files are refused")
    args = parser.parse_args(argv)
    if str(args.output) == "-":
        parser.error("An explicit output file is required")
    try:
        if not args.output.parent.is_dir() or args.output.exists() or args.output.is_symlink() or args.output.resolve() in {args.input.resolve(), args.authorization.resolve()}:
            parser.error("Output must be a new, separate file")
        # Suppress decoder diagnostics as well as exception text. No source text
        # goes to a terminal or an incidental diagnostic file, even on failure.
        with open(os.devnull, "w", encoding="utf-8") as discard, redirect_stdout(discard), redirect_stderr(discard):
            geometry = extract_pdf(args.input, args.authorization, args.level, require_storage_permission=True)
            encoded = json.dumps(geometry, ensure_ascii=False, allow_nan=False, sort_keys=True)
        # Exclusive creation also guards against an output-path race after checks.
        with args.output.open("x", encoding="utf-8", newline="\n") as destination:
            destination.write(encoded + "\n")
    except Exception:
        print("Extraction blocked or failed.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
