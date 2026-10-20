import { GlassSurface } from '../../src/components/glass-surface';
import { ThemeControl } from '../../src/components/theme-control';
import { TransparencyControl, TransparencySync } from '../../src/components/transparency-control';
import { LocaleProvider } from '../../src/i18n/provider';

// Test fixture only. Real shared components; no extra application route or API implementation.
export function FoundationFixture() {
  return <LocaleProvider initialLocale="en"><TransparencySync /><main>
    <h1>WorkLingo appearance foundation</h1>
    <ThemeControl /><TransparencyControl />
    <label>Draft answer<textarea defaultValue="My unfinished answer" /></label>
    <button type="button" className="primary-button">Continue learning</button>
    <article className="fixture-content"><h2>Stable lesson content</h2><p>This reading surface stays solid.</p></article>
    <div className="fixture-grid">
      {(['regular', 'clear', 'tinted', 'solid'] as const).flatMap((variant) => ['black', 'white'].map((backdrop) => (
        <div key={`${variant}-${backdrop}`} className="fixture-backdrop" style={{ backgroundColor: backdrop }}>
          <GlassSurface variant={variant} tint={variant === 'tinted' ? 'indigo' : 'none'} data-testid={`${variant}-${backdrop}`}>
            <span data-foreground>{variant}: readable controls</span><span data-swatch aria-hidden="true" />
          </GlassSurface>
        </div>
      )))}
    </div>
    <GlassSurface data-testid="outer"><GlassSurface data-testid="nested">Nested safety fallback</GlassSurface></GlassSurface>
  </main></LocaleProvider>;
}
