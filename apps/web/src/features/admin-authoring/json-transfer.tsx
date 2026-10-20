import { useId, useState } from 'react';
import type { z } from 'zod';

export function JsonTransfer({ content, schema, label, summary, importLabel, exportLabel, templateLabel, template, locale, disabled, onChange, onDirty }: {
  readonly content: unknown; readonly schema: z.ZodType; readonly label: string; readonly summary: string;
  readonly importLabel: string; readonly exportLabel: string; readonly templateLabel: string; readonly template: () => unknown;
  readonly locale: string; readonly disabled: boolean; readonly onChange: (value: unknown) => void; readonly onDirty: (dirty: boolean) => void;
}) {
  const id = useId();
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState('');
  const reset = (value: unknown) => { setSource(JSON.stringify(value, null, 2)); setError(''); onDirty(false); };
  return <details className="authoring-import"><summary>{summary}</summary><label htmlFor={id}>{label}</label>
    <textarea id={id} spellCheck={false} disabled={disabled} value={source ?? JSON.stringify(content, null, 2)} onChange={event => { setSource(event.target.value); setError(''); onDirty(true); }} />
    {error ? <p role="alert">{locale === 'vi' ? 'JSON không hợp lệ. Không áp dụng nội dung nhập. ' : 'Invalid JSON. Import was not applied. '}{error}</p> : null}
    <div className="authoring-actions"><button type="button" disabled={disabled} onClick={() => {
      try { const value: unknown = JSON.parse(source ?? JSON.stringify(content)); schema.parse(value); onChange(value); reset(value); }
      catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    }}>{importLabel}</button><button type="button" disabled={disabled} onClick={() => reset(content)}>{exportLabel}</button>
      <button type="button" disabled={disabled} onClick={() => { setSource(JSON.stringify(template(), null, 2)); setError(''); onDirty(true); }}>{templateLabel}</button></div>
  </details>;
}
