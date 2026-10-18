import { useId, useState } from 'react';
import './structured-fields.css';

type Label = readonly [en: string, vi: string];
type BaseField = { label: Label; help?: Label };
export type FieldSpec = BaseField & (
  | { type: 'text' | 'number' | 'boolean'; multiline?: boolean; nullable?: boolean; readonly?: boolean; options?: readonly (string | number)[] }
  | { type: 'object'; fields: Record<string, FieldSpec>; create?: () => Record<string, unknown>; collapsible?: boolean }
  | { type: 'array'; item: FieldSpec; create: () => unknown }
);

function ArrayEntry({ label, spec, value, initialOpen, onChange, onRemove, locale, path, disabled }: {
  readonly label: string; readonly spec: FieldSpec; readonly value: unknown; readonly initialOpen: boolean;
  readonly onChange: (value: unknown) => void; readonly onRemove: () => void; readonly locale: string; readonly path: string; readonly disabled: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  return <details className="authoring-item" open={open} onToggle={event => setOpen(event.currentTarget.open)}><summary>{label}</summary>
    {open || spec.type !== 'object' ? <><StructuredFields spec={spec} value={value} locale={locale} path={path} disabled={disabled} onChange={onChange} />
      <button type="button" disabled={disabled} onClick={onRemove}>{locale === 'vi' ? 'Bỏ' : 'Remove'} {label}</button></> : null}
  </details>;
}

export function StructuredFields({ spec, value, onChange, locale, path = '', disabled = false }: {
  readonly spec: FieldSpec; readonly value: unknown; readonly onChange: (value: unknown) => void;
  readonly locale: string; readonly path?: string; readonly disabled?: boolean;
}) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const lang = locale === 'vi' ? 1 : 0;
  const label = spec.label[lang];
  if (spec.type === 'object') {
    if (spec.collapsible) return <details className="authoring-item" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}><summary>{label}</summary>
      {expanded ? <StructuredFields spec={{ ...spec, collapsible: false }} value={value} locale={locale} path={path} disabled={disabled} onChange={onChange} /> : null}
    </details>;
    const object = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
    return <fieldset className="authoring-fields" disabled={disabled}><legend>{label}</legend>
      {object ? Object.entries(spec.fields).map(([key, field]) => <StructuredFields key={key} spec={field} value={object[key]} locale={locale} path={path ? `${path}.${key}` : key} disabled={disabled}
        onChange={next => onChange({ ...object, [key]: next })} />) : spec.create ? <button type="button" onClick={() => onChange(spec.create!())}>{lang ? 'Thêm' : 'Add'} {label}</button> : null}
    </fieldset>;
  }
  if (spec.type === 'array') {
    const values = Array.isArray(value) ? value : [];
    return <fieldset className="authoring-fields" disabled={disabled}><legend>{label}</legend>
      {values.map((item, index) => <ArrayEntry key={index} label={`${label} ${index + 1}`} spec={spec.item} value={item} initialOpen={values.length <= 3} locale={locale} path={`${path}.${index}`} disabled={disabled}
        onChange={next => onChange(values.map((entry, i) => i === index ? next : entry))} onRemove={() => onChange(values.filter((_, i) => i !== index))} />)}
      <button type="button" onClick={() => onChange([...values, spec.create()])}>{lang ? 'Thêm' : 'Add'} {label}</button>
      {spec.help ? <p>{spec.help[lang]}</p> : null}
    </fieldset>;
  }
  const text = typeof value === 'string' || typeof value === 'number' ? value : '';
  return <div className="authoring-field"><label htmlFor={id}>{label}</label>
    {spec.options ? <select id={id} disabled={disabled || spec.readonly} value={text} onChange={event => onChange(spec.type === 'number' ? Number(event.target.value) : event.target.value)}>{spec.options.map(option => <option key={option} value={option}>{option}</option>)}</select>
      : spec.type === 'boolean' ? <input id={id} type="checkbox" disabled={disabled || spec.readonly} checked={value === true} onChange={event => onChange(event.target.checked)} />
        : spec.multiline ? <textarea id={id} rows={3} disabled={disabled} readOnly={spec.readonly} value={text} onChange={event => onChange(event.target.value)} />
          : <input id={id} type={spec.type === 'number' ? 'number' : 'text'} step={spec.type === 'number' ? 'any' : undefined} disabled={disabled} readOnly={spec.readonly} value={text}
            onChange={event => onChange(event.target.value === '' && spec.nullable ? null : spec.type === 'number' ? Number(event.target.value) : event.target.value)} />}
    {spec.help ? <p id={`${id}-help`}>{spec.help[lang]}</p> : null}
  </div>;
}
