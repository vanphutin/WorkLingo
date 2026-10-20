import { useId } from 'react';

export function AuthoringConfirmation({ title, description, confirm, cancel, busy, onConfirm, onCancel }: {
  readonly title: string; readonly description: string; readonly confirm: string; readonly cancel: string;
  readonly busy: boolean; readonly onConfirm: () => void; readonly onCancel: () => void;
}) {
  const id = useId();
  return <section role="alertdialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} className="authoring-fields">
    <h3 id={`${id}-title`}>{title}</h3><p id={`${id}-description`}>{description}</p>
    <div className="authoring-actions"><button type="button" autoFocus disabled={busy} onClick={onCancel}>{cancel}</button><button type="button" disabled={busy} onClick={onConfirm}>{confirm}</button></div>
  </section>;
}
