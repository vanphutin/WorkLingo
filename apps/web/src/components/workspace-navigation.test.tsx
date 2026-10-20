import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceNavigation } from './workspace-navigation';
import type { ComponentProps } from 'react';
import type NextLink from 'next/link';

let pathname = '/settings/audio';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
const items = [{ href: '/dashboard', label: 'Dashboard' }, { href: '/programs', label: 'Programs' },
  { href: '/mastery', label: 'Mastery' }, { href: '/ielts/pathway', label: 'IELTS pathway' }, { href: '/settings', label: 'Settings' }];
afterEach(() => { cleanup(); vi.unstubAllGlobals(); pathname = '/settings/audio'; });

describe('WorkspaceNavigation', () => {
  it('uses the supplied guarded link and marks only the most specific destination', () => {
    pathname = '/admin/programs/intermediate/topics';
    const Guarded = ({ children, href, ...props }: ComponentProps<typeof NextLink>) => <a {...props} href={String(href)} data-guarded="true">{children}</a>;
    render(<WorkspaceNavigation label="Admin workspace" variant="admin" linkComponent={Guarded} items={[
      { href: '/admin', label: 'Overview' },
      { href: '/admin/programs/intermediate', label: 'Intermediate' },
      { href: '/admin/programs/intermediate/topics', label: 'Topics' },
    ]} />);
    expect(screen.getByRole('link', { name: 'Topics' })).toHaveAttribute('data-guarded', 'true');
    expect(screen.getByRole('link', { name: 'Topics' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Intermediate' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });
  it('retains all destinations and marks only the real active route segment', () => {
    const { rerender } = render(<WorkspaceNavigation items={items} label="Learning navigation" />);
    const nav = screen.getByRole('navigation');
    expect(within(nav).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(items.map((item) => item.href));
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
    pathname = '/settings-other';
    rerender(<WorkspaceNavigation items={items} label="Learning navigation" />);
    expect(screen.getByRole('link', { name: 'Settings' })).not.toHaveAttribute('aria-current');
  });

  it('uses a nonmodal disclosure with Escape returning focus and no trapped Tab', () => {
    render(<><WorkspaceNavigation items={items} label="Learning navigation" /><button>Continue answer</button></>);
    const trigger = screen.getByRole('button', { name: 'Learning navigation' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(trigger.getAttribute('aria-controls')!)).toHaveAttribute('aria-label', 'Learning navigation');
    const last = screen.getByRole('link', { name: 'Settings' });
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(last, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on outside interaction without stealing focus or changing a draft', () => {
    render(<><WorkspaceNavigation items={items} label="Learning navigation" /><label>Draft<textarea defaultValue="Keep this answer" /></label></>);
    const trigger = screen.getByRole('button', { name: 'Learning navigation' });
    fireEvent.click(trigger);
    const draft = screen.getByRole('textbox');
    draft.focus();
    fireEvent.pointerDown(draft);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(draft).toHaveFocus();
    expect(draft).toHaveValue('Keep this answer');
    expect(document.body.style.overflow).toBe('');
  });

  it('closes on route changes and stays closed when returning to the previous URL', async () => {
    const view = () => <WorkspaceNavigation items={items} label="Learning navigation" />;
    const { rerender } = render(view());
    const trigger = screen.getByRole('button', { name: 'Learning navigation' });
    fireEvent.click(trigger);
    pathname = '/programs'; rerender(view());
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
    pathname = '/settings/audio'; rerender(view());
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('returns focus when activating the current destination closes the disclosure', () => {
    pathname = '/settings';
    render(<WorkspaceNavigation items={items} label="Learning navigation" compact />);
    const trigger = screen.getByRole('button', { name: 'Learning navigation' });
    fireEvent.click(trigger);
    const current = screen.getByRole('link', { name: 'Settings' });
    current.focus();
    fireEvent.click(current, { button: 0 }); // Native keyboard activation dispatches an ordinary click.
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('resets responsive state, moves focus out of hidden controls and removes its media listener', () => {
    let changed: (event: { matches: boolean }) => void = () => {};
    const removeEventListener = vi.fn();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false,
      addEventListener: (_: string, listener: typeof changed) => { changed = listener; }, removeEventListener })));
    const { unmount } = render(<WorkspaceNavigation items={items} label="Learning navigation" />);
    const trigger = screen.getByRole('button', { name: 'Learning navigation' });
    trigger.focus(); fireEvent.click(trigger);
    fireEvent(window, new Event('resize')); // CSS handles geometry; only breakpoint changes reset disclosure.
    act(() => changed({ matches: true }));
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    screen.getByRole('link', { name: 'Settings' }).blur(); // Browser can hide the node before its media event.
    act(() => changed({ matches: false }));
    expect(trigger).toHaveFocus();
    unmount();
    expect(removeEventListener).toHaveBeenCalledWith('change', changed);
  });

  it('keeps compact exam navigation hidden until explicitly requested', () => {
    render(<WorkspaceNavigation items={items} label="Learning navigation" compact />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Learning navigation' }));
    expect(screen.getByRole('navigation')).toBeVisible();
  });

  it('keeps compact navigation usable across responsive breakpoints', () => {
    let changed: (event: { matches: boolean }) => void = () => {};
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true,
      addEventListener: (_: string, listener: typeof changed) => { changed = listener; }, removeEventListener: vi.fn() })));
    render(<WorkspaceNavigation items={items} label="Learning navigation" compact />);
    const trigger = screen.getByRole('button', { name: 'Learning navigation' });
    fireEvent.click(trigger);
    screen.getByRole('link', { name: 'Settings' }).focus();
    act(() => changed({ matches: false }));
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('ignores media notifications that retain the current breakpoint', () => {
    let changed: (event: { matches: boolean }) => void = () => {};
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true,
      addEventListener: (_: string, listener: typeof changed) => { changed = listener; }, removeEventListener: vi.fn() })));
    render(<WorkspaceNavigation items={items} label="Learning navigation" compact />);
    const trigger = screen.getByRole('button', { name: 'Learning navigation' });
    fireEvent.click(trigger);
    act(() => changed({ matches: true }));
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation')).toBeVisible();
  });
});
