import { THEME_STORAGE_KEY, initialTheme } from './initial-theme';

/**
 * `initialTheme` as a self-contained script for <head>. It is built from the
 * function's own source, so the two cannot drift apart.
 */
export const initialThemeScript = `(function(){try{var t=(${initialTheme.toString()})(location.pathname,localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)}),matchMedia('(prefers-color-scheme: dark)').matches);var d=document.documentElement;d.classList.remove('light','dark');d.classList.add(t);d.setAttribute('data-theme',t);d.style.colorScheme=t;}catch(e){}})();`;
