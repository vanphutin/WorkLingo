import { hydrateRoot } from 'react-dom/client';
import { FoundationFixture } from './liquid-glass-foundation';

hydrateRoot(document.getElementById('root')!, <FoundationFixture />);
