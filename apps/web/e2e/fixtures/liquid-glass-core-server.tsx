import { renderToString } from 'react-dom/server';
import { CoreFixture } from './liquid-glass-core';
export const markup = renderToString(<CoreFixture />);
