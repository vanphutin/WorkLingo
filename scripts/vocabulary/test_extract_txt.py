import unittest
from extract_txt import parse_text


class TxtExtractionTests(unittest.TestCase):
    def test_inline_and_wrapped_rows_preserve_source_lines_and_duplicate_occurrences(self):
        source = "English A1 Wordlist\nTable of Contents\nTools ........ 2\nOther ........ 3\nNo. Word Pronunciation\n(AmE) Definition\nTools\n1 test tool (n.) /test/ First\nwrapped definition.\n2 test tool (v.) /test/ To test.\nOther\n1 test tool (n.) /test/ Another meaning.\n"
        result = parse_text(source, 'a' * 64)
        rows = result['manifests']['A1']['rows']
        self.assertEqual(len(rows), 3)
        self.assertEqual(rows[0]['rawWord'], 'test tool')
        self.assertEqual(rows[0]['permittedDefinition'], 'First\nwrapped definition.')
        self.assertEqual(rows[0]['sourceLineStart'], 8)
        self.assertEqual(rows[0]['sourceLineEnd'], 9)
        self.assertEqual(rows[2]['sourceEntryKey'], 'topic-2:1')
        self.assertEqual(result['statistics']['A1']['expected'], 'EXPECTED_UNKNOWN')

    def test_vertical_rows_and_ipa_before_ordinal_do_not_attach_to_previous_word(self):
        source = "English B1 Wordlist\nTools ........ 2\nNo. Word Pronunciation\nTools\n1\nfixture (n.)\n/test/\nFirst definition.\n/next/\n2\nnext fixture (n.)\nSecond definition.\n3\nlast fixture (n.)\n/last/\nThird.\n2\nLangeek.co\nB1 English Vocabulary List\n"
        rows = parse_text(source, 'a' * 64)['manifests']['B1']['rows']
        self.assertEqual(len(rows), 3)
        self.assertEqual(rows[0]['permittedDefinition'], 'First definition.')
        self.assertEqual(rows[1]['pronunciation'], '/next/')
        self.assertEqual(rows[1]['permittedDefinition'], 'Second definition.')
        self.assertEqual(rows[1]['sourceLineStart'], 9)

    def test_missing_pos_and_ordinal_gaps_are_preserved_for_review(self):
        result = parse_text("English A2 Wordlist\nTools .... 2\nNo. Word Pronunciation\nTools\n1 fixture /test/ A definition.\n3 other (n.) /other/ Another.\n", 'a' * 64)
        manifest = result['manifests']['A2']
        self.assertEqual(len(manifest['rows']), 2)
        self.assertIn('UNKNOWN_POS', manifest['rows'][0]['warnings'])
        self.assertIn('ORDINAL_GAP', [e['code'] for p in manifest['inventory']['pages'] for e in p['exceptions']])

    def test_level_boundaries_are_not_confused_with_toc_titles(self):
        result = parse_text("English A1 Wordlist\nEnglish A1 Wordlist ........ 0\nTools .... 2\nNo. Word Pronunciation\nTools\n1 fixture (n.) /test/ Definition.\nEnglish A2 Wordlist\nTools .... 2\nNo. Word Pronunciation\nTools\n1 fixture (n.) /test/ Definition.\n", 'b' * 64)
        self.assertEqual(list(result['manifests']), ['A1', 'A2'])

    def test_recovers_explicit_reordered_pos_and_headword_before_ordinal(self):
        source = "English A1 Wordlist\nTools .... 2\nNo. Word Pronunciation\nTools\n1 (n.) fixture /test/ First.\nnext fixture (n.)\n2\n/next/\nSecond.\n3 (v turn down ). /third/ Third.\n4\n).\nlast fixture\n(n\n/last/\nLast.\n"
        rows = parse_text(source, 'c' * 64)['manifests']['A1']['rows']
        self.assertEqual([r['parsedWord'] for r in rows], ['fixture', 'next fixture', 'turn down', 'last fixture'])
        self.assertEqual([r['normalizedPos'] for r in rows], ['NOUN', 'NOUN', 'VERB', 'NOUN'])
        self.assertEqual([r['warnings'] for r in rows], [[], [], [], []])
        self.assertEqual(rows[0]['permittedDefinition'], 'First.')

    def test_ipa_delimiters_preserve_alternatives_and_do_not_consume_slashes_in_headwords(self):
        source = "English A1 Wordlist\nTools .... 2\nNo. Word Pronunciation\nTools\n1 aunt (n.) /ant/ or /aant/ A relation.\n2 be drawn to sb (phr.) /bi/ˈdraun tu/ Definition.\n3\nget rid of sb/sth (phr.)\n/get rid/\nRemove.\n"
        rows = parse_text(source, 'd' * 64)['manifests']['A1']['rows']
        self.assertEqual([r['pronunciation'] for r in rows], ['/ant/ or /aant/', '/bi/ˈdraun tu/', '/get rid/'])
        self.assertEqual(rows[2]['rawWord'], 'get rid of sb/sth')
        self.assertEqual(rows[0]['permittedDefinition'], 'A relation.')

    def test_branding_alone_does_not_erase_an_ordinal(self):
        source = "English A1 Wordlist\nTools .... 2\nNo. Word Pronunciation\nTools\n1 fixture (n.) /test/ First.\n2\nLangeek.co\nnext (n.)\n/next/\nSecond.\n"
        rows = parse_text(source, 'e' * 64)['manifests']['A1']['rows']
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[1]['parsedWord'], 'next')

    def test_pos_in_definition_is_not_promoted_to_headword_pos(self):
        source = "English A1 Wordlist\nTools .... 2\nNo. Word Pronunciation\nTools\n1 fixture /test/ The abbreviation (n.) denotes a noun.\n"
        row = parse_text(source, 'e' * 64)['manifests']['A1']['rows'][0]
        self.assertEqual(row['rawWord'], 'fixture')
        self.assertEqual(row['rawPos'], '')
        self.assertIn('UNKNOWN_POS', row['warnings'])

    def test_preordinal_ipa_with_wrapped_form_and_standalone_pos(self):
        source = "English A1 Wordlist\nTools .... 2\nNo. Word Pronunciation\nTools\n1 first (n.) /first/ First.\n/second/\n2\nvideo game\nconsole (n.)\nA device.\n/third/\n3\nhave second thoughts\n(phr.)\nTo reconsider.\n"
        rows = parse_text(source, 'e' * 64)['manifests']['A1']['rows']
        self.assertEqual([r['normalizedPos'] for r in rows], ['NOUN', 'NOUN', 'PHRASE'])
        self.assertEqual(rows[1]['parsedWord'], 'video game console')

    def test_declared_count_mismatch_blocks_reconciliation(self):
        source = "English A1 Wordlist\nTotal entries: 2\nTools .... 2\nNo. Word Pronunciation\nTools\n1 fixture (n.) /test/ First.\n"
        result = parse_text(source, 'e' * 64)
        self.assertEqual(result['statistics']['A1']['expected'], 2)
        self.assertIn('PUBLISHED_COUNT_MISMATCH', [e['code'] for p in result['manifests']['A1']['inventory']['pages'] for e in p['exceptions']])


if __name__ == '__main__':
    unittest.main()
