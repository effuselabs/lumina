/**
 * A full page load, not a client-side route change. Used after sign-in so the
 * server renders the dashboard with the new session cookie. Its own module so
 * tests can see how many times a page navigates.
 */
export function hardNavigate(url: string): void {
  window.location.assign(url);
}
