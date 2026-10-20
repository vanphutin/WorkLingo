import { renderToString } from 'react-dom/server';
import { FoundationFixture } from './liquid-glass-foundation';

export const markup = renderToString(<FoundationFixture />);
