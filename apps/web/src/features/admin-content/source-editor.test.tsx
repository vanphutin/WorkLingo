import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React, { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SourceEditor, type SourceEditorHandle } from './source-editor';

afterEach(() => {
  cleanup();
});

describe('SourceEditor', () => {
  it('renders line gutter and controlled textarea', () => {
    const source = 'Line 1\nLine 2\nLine 3';
    render(<SourceEditor source={source} onChange={vi.fn()} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    const textarea = screen.getByRole('textbox', { name: /lesson source editor/i });
    expect(textarea).toHaveValue(source);
  });

  it('calls onChange when user types into textarea', () => {
    const onChange = vi.fn();
    render(<SourceEditor source="Initial" onChange={onChange} />);

    const textarea = screen.getByRole('textbox', { name: /lesson source editor/i });
    fireEvent.change(textarea, { target: { value: 'Updated text' } });

    expect(onChange).toHaveBeenCalledWith('Updated text');
  });

  it('allows focusing and setting selection range via ref handle', () => {
    const ref = createRef<SourceEditorHandle>();
    render(<SourceEditor ref={ref} source="Hello World\nSecond Line" onChange={vi.fn()} />);

    ref.current?.setSelection(6, 11); // "World"
    const textarea = screen.getByRole('textbox', {
      name: /lesson source editor/i,
    }) as HTMLTextAreaElement;

    expect(textarea.selectionStart).toBe(6);
    expect(textarea.selectionEnd).toBe(11);
  });

  it('respects readOnly property', () => {
    render(<SourceEditor source="Immutable" onChange={vi.fn()} readOnly />);
    const textarea = screen.getByRole('textbox', { name: /lesson source editor/i });
    expect(textarea).toHaveAttribute('readonly');
  });
});
