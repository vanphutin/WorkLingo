"""Synthetic page objects only: never read or generate a PDF in these tests."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from extract_pdf import extract_pages, extract_pdf


class SyntheticPage:
    width = 600
    height = 800

    def __init__(self, words):
        self.words = words

    def extract_words(self, **kwargs):
        return self.words


def word(text="cafe\u0301", x0=10, top=20):
    return dict(text=text, x0=x0, x1=x0 + 30, top=top, bottom=top + 10)


class GeometryExtractionTests(unittest.TestCase):
    def test_deterministic_geometry_preserves_raw_unicode_and_page_count(self):
        words = [word("second", 90), word()]
        result = extract_pages([SyntheticPage(words), SyntheticPage([])], "a" * 64, "C1")
        self.assertEqual(result.get("pageCount"), 2)
        self.assertEqual(result["documentSha256"], "a" * 64)
        self.assertEqual(result["cefrLevel"], "C1")
        self.assertEqual(result["pages"][0]["words"], [word(), word("second", 90)])
        self.assertEqual(result["pages"][1]["words"], [])
        self.assertEqual(result, extract_pages([SyntheticPage(list(reversed(words))), SyntheticPage([])], "a" * 64, "C1"))

    def test_missing_native_text_is_retained_for_parser_ocr_exception(self):
        self.assertEqual(extract_pages([SyntheticPage([])], "a" * 64, "A1").get("pages"), [dict(pageIndex=0, width=600, height=800, words=[])])

    def test_invalid_geometry_or_resource_limits_fail_explicitly(self):
        for words in [[word(x0=-1)], [dict(word(), bottom=float("nan"))], [word()] * 20001, [dict(word(), text="")]]:
            with self.subTest(words_count=len(words)):
                with self.assertRaises(ValueError):
                    extract_pages([SyntheticPage(words)], "a" * 64, "A1")
        with self.assertRaises(ValueError):
            extract_pages([], "a" * 64, "A1")
        with self.assertRaises(ValueError):
            extract_pages([SyntheticPage([])], "a" * 64, "C2")

    def test_rights_file_is_required_before_opening_source(self):
        with self.assertRaises(PermissionError):
            extract_pdf(Path("does-not-exist.pdf"), None, "A1")

    def test_invalid_authorization_never_reads_pdf(self):
        with tempfile.TemporaryDirectory() as folder:
            auth = Path(folder) / "rights.json"
            for invalid in [{}, {"rightsStatus": "PENDING"}, {"rightsStatus": "APPROVED", "permissionReference": "synthetic", "allowedUses": ["EXTRACT"], "allowedFields": ["FORM"], "documentSha256": "a" * 64}]:
                auth.write_text(json.dumps(invalid), encoding="utf-8")
                with self.subTest(invalid=invalid):
                    with self.assertRaises(PermissionError):
                        extract_pdf(Path(folder) / "absent.pdf", auth, "A1")

    def test_hash_binding_fails_before_pdf_decoder(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "synthetic.bin"
            source.write_bytes(b"synthetic non-PDF bytes")
            auth = Path(folder) / "rights.json"
            auth.write_text(json.dumps(dict(rightsStatus="APPROVED", permissionReference="synthetic-test-only", allowedUses=["EXTRACT"], allowedFields=["FORM", "PRONUNCIATION", "DEFINITION"], documentSha256="a" * 64)), encoding="utf-8")
            with patch("pdfplumber.open", side_effect=AssertionError("decoder must not run before hash validation")), self.assertRaisesRegex(PermissionError, "hash"):
                extract_pdf(source, auth, "A1")

    def test_authorized_adapter_maps_synthetic_decoder_pages(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "synthetic.bin"
            source.write_bytes(b"synthetic non-PDF bytes")
            digest = hashlib.sha256(source.read_bytes()).hexdigest()
            auth = Path(folder) / "rights.json"
            auth.write_text(json.dumps(dict(rightsStatus="APPROVED", permissionReference="synthetic-test-only", allowedUses=["EXTRACT"], allowedFields=["FORM", "PRONUNCIATION", "DEFINITION"], documentSha256=digest)), encoding="utf-8")
            with patch("pdfplumber.open") as decoder:
                decoder.return_value.__enter__.return_value.pages = [SyntheticPage([word()])]
                result = extract_pdf(source, auth, "B2")
            self.assertEqual(result.get("pages"), [dict(pageIndex=0, width=600, height=800, words=[word()])])
            self.assertEqual(result["documentSha256"], digest)

    def test_malformed_or_partial_grants_fail_before_source_read(self):
        grant = dict(rightsStatus="APPROVED", permissionReference="synthetic", allowedUses=["EXTRACT"], allowedFields=["FORM", "PRONUNCIATION", "DEFINITION"], documentSha256="a" * 64)
        with tempfile.TemporaryDirectory() as folder:
            auth = Path(folder) / "rights.json"
            invalid = [None, [], dict(grant, rightsStatus="PENDING"), dict(grant, rightsStatus="REVOKED"), dict(grant, allowedUses=[]), dict(grant, allowedUses="EXTRACT"), dict(grant, allowedFields="FORM PRONUNCIATION DEFINITION"), dict(grant, permissionReference=" "), dict(grant, documentSha256="bad")]
            invalid.extend(dict(grant, allowedFields=[item for item in grant["allowedFields"] if item != field]) for field in grant["allowedFields"])
            for value in invalid:
                auth.write_text(json.dumps(value), encoding="utf-8")
                with self.subTest(value=value), self.assertRaises(PermissionError):
                    extract_pdf(Path(folder) / "absent.bin", auth, "A1")
            auth.write_text("{invalid", encoding="utf-8")
            with self.assertRaises(PermissionError):
                extract_pdf(Path(folder) / "absent.bin", auth, "A1")

    def test_page_and_document_bounds_and_hash_are_validated(self):
        for digest in ["bad", "A" * 64]:
            with self.subTest(digest=digest), self.assertRaises(ValueError):
                extract_pages([SyntheticPage([])], digest, "A1")
        for width in [0, float("inf"), True]:
            page = SyntheticPage([])
            page.width = width
            with self.subTest(width=width), self.assertRaises(ValueError):
                extract_pages([page], "a" * 64, "A1")
        with self.assertRaises(ValueError):
            extract_pages((SyntheticPage([]) for _ in range(2001)), "a" * 64, "A1")

    def test_all_five_synthetic_levels_preserve_ipa_without_normalizing(self):
        for level in ["A1", "A2", "B1", "B2", "C1"]:
            with self.subTest(level=level):
                result = extract_pages([SyntheticPage([word("/kæ.feɪ/")])], "a" * 64, level)
                self.assertEqual(result["cefrLevel"], level)
                self.assertEqual(result["pages"][0]["words"][0]["text"], "/kæ.feɪ/")


class ExtractionCliTests(unittest.TestCase):
    """Execute the real script; replace only the native decoder dependency."""

    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.folder = Path(temporary.name)
        self.source = self.folder / "synthetic.bin"
        self.source.write_bytes(b"synthetic non-PDF bytes")
        self.authorization = self.folder / "rights.json"
        self.grant = dict(rightsStatus="APPROVED", permissionReference="synthetic-test-only", allowedUses=["EXTRACT", "STORE"], allowedFields=["FORM", "PRONUNCIATION", "DEFINITION"], documentSha256=hashlib.sha256(self.source.read_bytes()).hexdigest())
        self.authorization.write_text(json.dumps(self.grant), encoding="utf-8")
        self.output = self.folder / "geometry.json"
        self.decoder_marker = self.folder / "decoder.loaded"
        (self.folder / "pdfplumber.py").write_text('''
from pathlib import Path
import os
import sys
Path(__file__).with_name("decoder.loaded").write_text("loaded")
class Page:
    width = 600
    height = 800
    def extract_words(self, **kwargs):
        return [dict(text="cafe\\u0301 /kæ.feɪ/", x0=10, x1=90, top=20, bottom=30)]
class Document:
    pages = [Page()]
    def __enter__(self):
        return self
    def __exit__(self, *args):
        pass
def open(stream):
    print("THIRD_PARTY_CONTENT_MARKER")
    print("THIRD_PARTY_CONTENT_MARKER", file=sys.stderr)
    if os.environ.get("SYNTHETIC_DECODER_FAIL"):
        raise ValueError("THIRD_PARTY_CONTENT_MARKER")
    return Document()
''', encoding="utf-8")

    def arguments(self):
        return ["--input", str(self.source), "--authorization", str(self.authorization), "--level", "A1", "--output", str(self.output)]

    def run_cli(self, arguments, **environment):
        return subprocess.run([sys.executable, str(Path(__file__).with_name("extract_pdf.py").resolve()), *arguments], cwd=self.folder, env={**os.environ, "PYTHONPATH": str(self.folder), "PYTHONDONTWRITEBYTECODE": "1", **environment}, capture_output=True, text=True, encoding="utf-8", timeout=15, check=False)

    def test_cli_requires_every_explicit_flag_before_decoder_or_output(self):
        for index in range(0, 8, 2):
            arguments = self.arguments()
            del arguments[index:index + 2]
            with self.subTest(missing=index):
                result = self.run_cli(arguments)
                self.assertEqual(result.returncode, 2)
                self.assertEqual(result.stdout, "")
                self.assertFalse(self.decoder_marker.exists())
                self.assertFalse(self.output.exists())

    def test_cli_rejects_invalid_level_unknown_flags_and_stdout_output_generically(self):
        for arguments in [self.arguments() + ["--THIRD_PARTY_CONTENT_MARKER"], [*self.arguments()[:5], "THIRD_PARTY_CONTENT_MARKER", *self.arguments()[6:]], [*self.arguments()[:-1], "-"]]:
            with self.subTest(arguments=arguments):
                result = self.run_cli(arguments)
                self.assertEqual(result.returncode, 2)
                self.assertEqual(result.stdout, "")
                self.assertNotIn("THIRD_PARTY_CONTENT_MARKER", result.stderr)
                self.assertFalse(self.decoder_marker.exists())
                self.assertFalse(self.output.exists())

    def test_cli_denies_rights_before_decoder_and_never_creates_output(self):
        for change in [dict(rightsStatus="REVOKED"), dict(allowedFields=["FORM"]), dict(allowedUses=[]), dict(allowedUses=["EXTRACT"]), dict(allowedUses=["STORE"])]:
            self.decoder_marker.unlink(missing_ok=True)
            self.output.unlink(missing_ok=True)
            self.authorization.write_text(json.dumps({**self.grant, **change}), encoding="utf-8")
            with self.subTest(change=change):
                result = self.run_cli(self.arguments())
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(result.stdout, "")
                self.assertFalse(self.decoder_marker.exists())
                self.assertFalse(self.output.exists())

    def test_cli_checks_hash_before_loading_decoder(self):
        self.authorization.write_text(json.dumps({**self.grant, "documentSha256": "a" * 64}), encoding="utf-8")
        result = self.run_cli(self.arguments())
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "")
        self.assertFalse(self.decoder_marker.exists())
        self.assertFalse(self.output.exists())

    def test_cli_writes_geometry_only_to_explicit_utf8_file(self):
        result = self.run_cli(self.arguments())
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(self.decoder_marker.exists())
        self.assertTrue(self.output.exists())
        geometry = json.loads(self.output.read_text(encoding="utf-8"))
        self.assertEqual(geometry["documentSha256"], self.grant["documentSha256"])
        self.assertEqual(geometry["pages"][0]["words"][0]["text"], "cafe\u0301 /kæ.feɪ/")
        self.assertEqual(result.stdout, "")
        self.assertEqual(result.stderr, "")

    def test_cli_decoder_errors_are_generic_and_leave_no_output(self):
        result = self.run_cli(self.arguments(), SYNTHETIC_DECODER_FAIL="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(self.decoder_marker.exists())
        self.assertFalse(self.output.exists())
        self.assertEqual(result.stdout, "")
        self.assertNotIn("THIRD_PARTY_CONTENT_MARKER", result.stderr)
        self.assertNotIn("Traceback", result.stderr)

    def test_cli_refuses_to_overwrite_output_source_or_authorization(self):
        self.output.write_bytes(b"existing output")
        for target in [self.output, self.source, self.authorization]:
            before = target.read_bytes()
            with self.subTest(target=target.name):
                result = self.run_cli([*self.arguments()[:-1], str(target)])
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(target.read_bytes(), before)
                self.assertFalse(self.decoder_marker.exists())
                self.assertEqual(result.stdout, "")

    def test_cli_validates_output_parent_before_loading_decoder(self):
        self.output = self.folder / "absent-folder" / "geometry.json"
        result = self.run_cli(self.arguments())
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.decoder_marker.exists())
        self.assertFalse(self.output.exists())
        self.assertEqual(result.stdout, "")


if __name__ == "__main__":
    unittest.main()
