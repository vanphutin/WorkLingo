# Conservative deduplication

Keep the original display text; search normalization uses Unicode NFC, whitespace
folding and English case folding. Legacy expression matching remains unchanged.
Do not strip apostrophes/hyphens, guess a lemma or split phrases into words.

Candidate matching is advisory: exact form/POS match → reviewed sense candidate →
possible duplicate → explicit new entry. Even exact spelling and POS do not prove
a shared sense. An administrator must choose NEW_ENTRY, NEW_SENSE or REUSE_SENSE.
Different POS, homographs and uncertain meaning are never silently merged.

Every original occurrence remains independently identifiable. Repeating the same
document/parser inventory and identical chunk is idempotent; changing a raw field
under the same source key is a provenance conflict. A new parser version must
reconcile against the earlier occurrence and its reviewed mapping, not overwrite it.

No Vietnamese translation, example, CEFR score or missing definition is fabricated
to satisfy a legacy non-null field. Linking to LanguageBlock records requires a
human-reviewed correspondence and leaves all old IDs/history intact.
