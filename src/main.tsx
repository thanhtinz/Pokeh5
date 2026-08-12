import { render } from 'preact';

import './styles/tokens.css';
import './styles/base.css';
import './styles/ink.css';
import './styles/layout.css';

import { App } from './ui/App';
import { store } from './game/store';

const root = document.getElementById('app');
if (!root) throw new Error('#app is missing from index.html');

void store.init().then(() => {
  render(<App />, root);
  document.getElementById('boot')?.classList.add('gone');
});

/**
 * Mobile browsers and WebViews only reliably fire `pagehide` when the app is
 * being backgrounded or killed, so that is where the save has to be flushed.
 */
const flush = () => store.flush();
window.addEventListener('pagehide', flush);
window.addEventListener('blur', flush);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
});
