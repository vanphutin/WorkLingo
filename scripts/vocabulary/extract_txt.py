"""TXT-only state machine. Never opens PDFs, calls AI/network, or writes a DB.

The existing manifest's pageIndex is a logical topic section for TXT. Locations
use line coordinates, NOT PDF geometry; explicit sourceLineStart/End are retained.
Raw TXT bytes and per-occurrence source lines are kept separately from normalization.
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import re
import unicodedata

LEVEL = re.compile(r"English (A1|A2|B1|B2|C1) Wordlist\s*\Z")
TOC = re.compile(r"(.+?)\s*\.{4,}\s*(\d+)\s*\Z")
ANCHOR = re.compile(r"(\d+)(?:\s+(.+))?\Z")
POS = re.compile(r"\((?:n|v|adj|adv|pron|prep|conj|det|intj|int|num|phr|phrase|sentence|\.)\.?\)", re.I)
IPA = re.compile(r"(?<!\S)/.+?/(?=\s|$)(?:\s+or\s+/.+?/(?=\s|$))*", re.S)
POS_MAP = dict(n='NOUN', v='VERB', adj='ADJECTIVE', adv='ADVERB', pron='PRONOUN', prep='PREPOSITION', conj='CONJUNCTION', det='DETERMINER', intj='INTERJECTION', int='INTERJECTION', num='NUMBER', phr='PHRASE', phrase='PHRASE', sentence='PHRASE')


def parse_text(source, digest):
    if not re.fullmatch(r'[a-f0-9]{64}', digest):
        raise ValueError('Invalid TXT digest')
    lines = source.splitlines()
    if len(lines) > 1000000:
        raise ValueError('TXT line limit exceeded')
    starts = [(i, LEVEL.fullmatch(line.strip())[1]) for i, line in enumerate(lines) if LEVEL.fullmatch(line.strip())]
    if not starts or len({level for _, level in starts}) != len(starts):
        raise ValueError('Missing or repeated level boundary')
    manifests, statistics, occurrences = {}, {}, []
    for section, (start, level) in enumerate(starts):
        end = starts[section + 1][0] if section + 1 < len(starts) else len(lines)
        titles = {m[1].strip() for line in lines[start:end] if (m := TOC.fullmatch(line.strip())) and not LEVEL.fullmatch(m[1].strip())}
        footer_lines = set()
        for i in range(start, end):
            if lines[i].strip() == 'Langeek.co':
                previous = next((j for j in range(i - 1, max(start - 1, i - 4), -1) if lines[j].strip()), None)
                following = next((j for j in range(i + 1, end) if lines[j].strip()), None)
                book_footer = following is not None and lines[following].strip() == f'{level} English Vocabulary List'
                if previous is not None and lines[previous].strip().isdigit() and book_footer:
                    footer_lines.add(previous)
        body = False
        pages, rows, raw_rows, unclassified = [], [], [], []
        topic = None
        current = None
        last_ordinal = 0

        def emit():
            nonlocal current
            if current is None:
                return
            tokens = current['tokens']
            # A complete IPA-only line immediately before the next ordinal may
            # be carried into this row as a prefix by the scanner below.
            raw = '\n'.join(text for _, text in tokens)
            # Interpret explicit copier ordering damage without changing rawLines.
            reordered = re.match(r'^\((n|v|adj|adv|pron|prep|conj|det|intj|int|num)\s+(.+?)\s*\)\.\s*', raw, re.I)
            interpretation = raw
            if reordered:
                interpretation = f'{reordered[2].strip()} ({reordered[1]}.) ' + raw[reordered.end():]
            split_pos = re.match(r'^\)\.\s*\n(.+?)\n\((n|v|adj|adv|pron|prep|conj|det|intj|int|num)\s*\n', interpretation, re.I)
            if split_pos:
                interpretation = f'{split_pos[1]} ({split_pos[2]}.)\n' + interpretation[split_pos.end():]
            ipa_match = IPA.search(interpretation)
            pronunciation = ipa_match[0] if ipa_match else None
            prefix_ipa = bool(ipa_match and not interpretation[:ipa_match.start()].strip())
            content = interpretation[ipa_match.end():].lstrip() if prefix_ipa else interpretation
            ipa_in_content = IPA.search(content)
            headword_region = content[:ipa_in_content.start()] if ipa_in_content else content.split('\n', 1)[0] if prefix_ipa else content
            if prefix_ipa and not POS.search(headword_region):
                head_lines = content.split('\n')
                # A copier may place the explicit POS after a wrapped form.
                # A POS inside a sentence is never evidence for a headword tag.
                for last in range(1, min(3, len(head_lines))):
                    if re.search(POS.pattern + r'\s*\Z', head_lines[last], re.I):
                        headword_region = '\n'.join(head_lines[:last + 1])
                        break
            pos_in_content = POS.search(headword_region)
            raw_pos = pos_in_content[0] if pos_in_content else ''
            if pos_in_content:
                form = content[:pos_in_content.start()].strip()
                rest = content[pos_in_content.end():].strip()
                rest_ipa = IPA.search(rest)
                if not form and rest_ipa:
                    form = rest[:rest_ipa.start()].strip()
                    definition = rest[rest_ipa.end():].strip()
                else:
                    definition = (rest[:rest_ipa.start()] + rest[rest_ipa.end():]).strip() if rest_ipa else rest
            elif ipa_in_content:
                form = content[:ipa_in_content.start()].strip()
                definition = content[ipa_in_content.end():].strip()
            else:
                form, definition = content.split('\n', 1) if '\n' in content else (content, '')
            normalized_pos = POS_MAP.get(re.sub(r'[().\s]', '', raw_pos.lower()), 'UNKNOWN')
            warnings = []
            if normalized_pos == 'UNKNOWN': warnings.append('UNKNOWN_POS')
            if not pronunciation: warnings.append('MISSING_PRONUNCIATION')
            if not definition: warnings.append('MISSING_DEFINITION')
            if not form: warnings.append('MISSING_FORM')
            first = min([current['anchorLine']] + [line for line, _ in tokens])
            last = max([current['anchorLine']] + [line for line, _ in tokens])
            location = dict(pageIndex=len(pages) - 1, bbox=[0, first, 1, last + 1])
            key = f"topic-{len(pages)}:{current['ordinal']}"
            for warning in warnings:
                pages[-1]['exceptions'].append(dict(code=warning, message='TXT field requires review', location=location))
            if not form:
                current = None
                return
            row = dict(sourceEntryKey=key, topicInstanceKey=f'topic-{len(pages)}', originalTopic=topic,
                       topicSequence=len(pages), rowOrdinal=current['ordinal'], pageIndex=len(pages)-1,
                       printedPageNumber=None, locations=[location], sourceLineStart=first, sourceLineEnd=last,
                       rawWord=form, parsedWord=unicodedata.normalize('NFC', re.sub(r'\s+', ' ', form)).strip(),
                       rawPos=raw_pos, normalizedPos=normalized_pos, cefrLevel=level, pronunciation=pronunciation,
                       permittedDefinition=definition or None, extractionConfidence=.5 if warnings else 1, warnings=warnings)
            rows.append(row)
            raw_rows.append(dict(cefrLevel=level, sourceEntryKey=key, sourceLineStart=first, sourceLineEnd=last,
                                 anchorLine=current['anchorLine'], contentLines=[line for line, _ in tokens],
                                 rawLines=[dict(line=line, text=lines[line-1]) for line in sorted(set([current['anchorLine']] + [line for line, _ in tokens]))],
                                 vietnameseMeaning=None, examples=[], enrichmentOrigin=None))
            current = None

        for i in range(start + 1, end):
            line = lines[i].strip()
            if not line:
                continue
            if re.match(r'^No\.\s+Word\b', line):
                body = True
                continue
            if not body or i in footer_lines or TOC.fullmatch(line):
                continue
            if line in titles:
                emit()
                topic = line
                last_ordinal = 0
                pages.append(dict(pageIndex=len(pages), detectedKeys=[], exceptions=[]))
                continue
            if re.match(r'^(?:Langeek\.co(?:\s|$)|(?:A1|A2|B1|B2|C1) (?:English Vocabulary List|Wordlist)|\(AmE\)(?:\s+Definition)?$|Categorized by Topic$|Pronunciation$|Definition$)', line):
                continue
            match = ANCHOR.fullmatch(line)
            if match:
                ordinal = int(match[1])
                prefix = []
                while current and current['tokens']:
                    tail = current['tokens'][-1][1]
                    before = '\n'.join(t for _, t in current['tokens'][:-1])
                    headword_pos = bool(re.fullmatch(r'.+\s+' + POS.pattern, tail, re.I))
                    if (IPA.fullmatch(tail) or headword_pos) and IPA.search(before) and POS.search(before):
                        prefix.insert(0, current['tokens'].pop())
                    else:
                        break
                emit()
                if topic is None:
                    unclassified.append(dict(line=i+1, code='MISSING_TOPIC'))
                    continue
                key = f'topic-{len(pages)}:{ordinal}'
                pages[-1]['detectedKeys'].append(key)
                if ordinal != last_ordinal + 1:
                    pages[-1]['exceptions'].append(dict(code='ORDINAL_GAP', message=f'TXT line {i+1}: ordinal sequence requires review'))
                last_ordinal = ordinal
                current = dict(ordinal=ordinal, anchorLine=i+1, tokens=prefix + ([(i+1, match[2])] if match[2] else []))
            elif current:
                current['tokens'].append((i+1, line))
            else:
                unclassified.append(dict(line=i+1, code='UNCLASSIFIED_TXT'))
        emit()
        if not pages:
            raise ValueError(f'No TXT topic sections: {level}')
        for item in unclassified:
            pages[0]['exceptions'].append(dict(code=item['code'], message=f"TXT line {item['line']}: unclassified source content"))
        manifests[level] = dict(documentSha256=digest, pageCount=len(pages), cefrLevel=level, parserVersion='langeek-txt/1', inventory=dict(pages=pages), rows=rows)
        forms = collections.Counter((re.sub(r'\s+', ' ', r['parsedWord']).casefold(), r['normalizedPos']) for r in rows)
        # Only explicit count statements in the supplied TXT may establish an expectation.
        declared = []
        for i in range(start, end):
            m = re.fullmatch(r'\s*(?:Total (?:vocabulary )?(?:words|entries)|Number of (?:words|entries))\s*[:=]\s*([\d,]+)\s*', lines[i], re.I)
            if m: declared.append(dict(line=i+1, count=int(m[1].replace(',', ''))))
        expected = declared[0]['count'] if len(declared) == 1 else 'EXPECTED_UNKNOWN'
        if len(declared) > 1:
            pages[0]['exceptions'].append(dict(code='AMBIGUOUS_PUBLISHED_COUNT', message='Multiple TXT count statements require review'))
        elif isinstance(expected, int) and expected != len(rows):
            pages[0]['exceptions'].append(dict(code='PUBLISHED_COUNT_MISMATCH', message='Published TXT count differs from extracted occurrence count'))
        statistics[level] = dict(expected=expected, publishedCountEvidence=declared, txtParsed=len(rows), topics=len(pages),
                                 duplicates=sum(n-1 for n in forms.values()), reviewRows=sum(bool(r['warnings']) for r in rows),
                                 exceptions=sum(len(p['exceptions']) for p in pages), unclassified=unclassified[:10], aiEnriched=0)
        occurrences.extend(raw_rows)
    return dict(manifests=manifests, statistics=statistics, occurrences=occurrences, sourceSha256=digest, sourceLines=len(lines))


def main():
    parser = argparse.ArgumentParser(description='Extract supplied UTF-8 TXT only, to a new private output directory')
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args()
    content = args.input.read_bytes()
    if len(content) > 64 * 1024 * 1024: raise ValueError('TXT size limit exceeded')
    result = parse_text(content.decode('utf-8-sig'), hashlib.sha256(content).hexdigest())
    args.output_dir.mkdir(parents=True, exist_ok=False)
    for level, manifest in result.pop('manifests').items():
        (args.output_dir / f'{level}-txt-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False), encoding='utf-8')
    with (args.output_dir / 'source-occurrences.jsonl').open('x', encoding='utf-8', newline='\n') as out:
        for occurrence in result.pop('occurrences'):
            out.write(json.dumps(occurrence, ensure_ascii=False) + '\n')
    (args.output_dir / 'txt-summary.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
