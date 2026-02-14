import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// import { logInfo } from './utils/log';

// Boot-time environment logging
// const graphql = import.meta.env.VITE_GRAPHQL_URL;
// const rest = import.meta.env.VITE_REST_BASE_URL;
// const pageSize = import.meta.env.VITE_PAGE_SIZE;
// const useDemo = import.meta.env.VITE_USE_DEMO;

// logInfo('[ENV]', 'boot', {
//   graphql,
//   rest,
//   pageSize,
//   useDemo,
//   hasToken: !!localStorage.getItem('sv.auth.token')
// });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
