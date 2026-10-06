'use client';

import React, { forwardRef, useImperativeHandle, useRef } from 'react';

export interface SourceEditorHandle {
  focus(): void;
  setSelection(start: number, end: number): void;
}

export interface SourceEditorProps {
  readonly source: string;
  readonly onChange: (newSource: string) => void;
  readonly readOnly?: boolean;
  readonly highlightedLines?: readonly number[];
}

export const SourceEditor = forwardRef<SourceEditorHandle, SourceEditorProps>(
  function SourceEditor({ source, onChange, readOnly = false, highlightedLines = [] }, ref) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const gutterRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      focus() {
        textareaRef.current?.focus();
      },
      setSelection(start: number, end: number) {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(start, end);
        }
      },
    }));

    const lines = source.split(/\r\n|\r|\n/);
    const lineCount = Math.max(1, lines.length);
    const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

    const highlightedSet = new Set(highlightedLines);

    function handleScroll() {
      if (textareaRef.current && gutterRef.current) {
        gutterRef.current.scrollTop = textareaRef.current.scrollTop;
      }
    }

    return (
      <div className={`source-editor-wrapper ${readOnly ? 'editor-readonly' : ''}`}>
        <div ref={gutterRef} className="editor-gutter" aria-hidden="true">
          {lineNumbers.map((num) => (
            <div
              key={num}
              className={`gutter-line-number ${highlightedSet.has(num) ? 'line-has-issue' : ''}`}
            >
              {num}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          aria-label="Lesson source editor"
          className="editor-textarea"
          value={source}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          readOnly={readOnly}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap="off"
        />
      </div>
    );
  },
);
