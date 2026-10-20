import { hydrateRoot } from 'react-dom/client';
import { CoreFixture } from './liquid-glass-core';
hydrateRoot(document.getElementById('root')!, <CoreFixture />);
