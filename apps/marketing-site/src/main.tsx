import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app';
import './styles.css';

const container = document.getElementById('root')!;
const rootContainer = container as HTMLElement & { _reactRoot?: ReactDOM.Root };

if (!rootContainer._reactRoot) {
  rootContainer._reactRoot = ReactDOM.createRoot(container);
}

rootContainer._reactRoot.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
