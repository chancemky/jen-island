// Links that open the store apps (universal links / app links on the game's website, or
// bistroisland://…): a friend invite (?friend=CODE) is added like on the website, and an
// email link (password reset, account confirmation) reloads the app with its session.

import { nativeApp } from '../core/util.js';
import { acceptInvite } from './social.js';

export function initDeepLinks() {
  const App = nativeApp() ? window.Capacitor?.Plugins?.App : null;
  if (!App) return;
  App.addListener('appUrlOpen', ({ url }) => {
    let u; try { u = new URL(url); } catch { return; }
    const friend = u.searchParams.get('friend');
    if (friend) { try { localStorage.setItem('jenisland.invite', friend.toUpperCase()); } catch { /* private */ } acceptInvite(); return; }
    if (/access_token=/.test(u.hash)) { location.hash = u.hash; location.reload(); }
  });
}
