import { createRoot } from 'react-dom/client';
import App from './App';

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(<App />);
  console.log('[TLA-REPRO] createRoot().render() called');
} else {
  console.error('[TLA-REPRO] #root element not found');
}
