import type { ComponentPropsWithRef } from 'react';

export type GlassSurfaceProps = ComponentPropsWithRef<'div'> & {
  readonly variant?: 'regular' | 'clear' | 'tinted' | 'solid';
  readonly tint?: 'none' | 'primary' | 'indigo';
};

export function GlassSurface({ variant = 'regular', tint = 'none', className, ...props }: GlassSurfaceProps) {
  return <div {...props} className={['glass-surface', className].filter(Boolean).join(' ')}
    data-glass-variant={variant} data-glass-tint={tint} />;
}
