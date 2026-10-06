// Supabase over plain REST. Only the publishable key ships to the browser;
// row-level security on the jen_island_* tables restricts every row to its
// owner (see supabase/migrations). This game never touches other tables.

import { nativeApp } from '../core/util.js';

export const CLOUD = { url: 'https://cgbaigeergwvbmghrakb.supabase.co', key: 'sb_publishable_w1-MKpH0ysDz_nXEt25cXA_n_1H5DBo', site: 'https://jen-island.jen-simulator.workers.dev/' };
const SESSION_KEY = 'jenisland.session';
let session = null, refreshing = null;

function readSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } }
function storeSession(d) {
  if (!d?.access_token) return;
  session = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + (d.expires_in || 3600) * 1000, user: d.user || session?.user };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* private mode */ }
}
async function raw(path, opt = {}, token) {
  const headers = { apikey: CLOUD.key, 'Content-Type': 'application/json', ...(opt.headers || {}) };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(CLOUD.url + path, { ...opt, headers });
  const txt = await res.text();
  let data = null; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  if (!res.ok) { const e = new Error(data?.msg || data?.message || data?.error_description || data?.error || 'Request failed (' + res.status + ')'); e.status = res.status; e.code = data?.code || data?.error_code; throw e; }
  return data;
}
async function fresh() {
  if (!session) throw new Error('Not signed in');
  if (Date.now() < session.expires_at - 90_000) return;
  refreshing ||= raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }) }).then(storeSession).finally(() => { refreshing = null; });
  await refreshing;
}
async function api(path, opt = {}) { await fresh(); return raw(path, opt, session.access_token); }

export function currentUser() { return session?.user ? { id: session.user.id, email: session.user.email, createdAt: Date.parse(session.user.created_at || '') || null } : null; }

export async function signUp(email, password) {
  let d = await raw('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
  if (!d.access_token) {
    try { d = await raw('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) }); }
    catch (e) { if (/confirm/i.test(e.message)) { const err = new Error('confirm'); err.confirm = true; throw err; } throw e; }
  }
  storeSession(d);
  return currentUser();
}
export async function signIn(email, password) {
  const d = await raw('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) });
  storeSession(d);
  return currentUser();
}
// Forgot password: Supabase emails a link back to the game, which opens the reset form.
export async function requestPasswordReset(email) {
  const back = nativeApp() ? CLOUD.site : location.origin + location.pathname;     // (from the app, the link opens the website)
  await raw('/auth/v1/recover?redirect_to=' + encodeURIComponent(back), { method: 'POST', body: JSON.stringify({ email }) });
}
// Links from our emails (password reset, account confirmation) arrive with a session in
// the URL hash. Returns 'recovery' or 'signup' after signing in with it, else null.
export async function takeLinkSession() {
  const q = new URLSearchParams(location.hash.slice(1));
  const token = q.get('access_token'), type = q.get('type');
  if (!token) return null;
  history.replaceState(null, '', location.pathname + location.search);      // (never leave a token in the address bar)
  session = { access_token: token, refresh_token: q.get('refresh_token'), expires_at: Date.now() + (+q.get('expires_in') || 3600) * 1000 };
  try { session.user = await raw('/auth/v1/user', {}, token); } catch { session = null; return null; }
  storeSession({ access_token: token, refresh_token: session.refresh_token, expires_in: +q.get('expires_in') || 3600, user: session.user });
  return type === 'recovery' ? 'recovery' : 'signup';
}
export async function setNewPassword(password) {
  await api('/auth/v1/user', { method: 'PUT', body: JSON.stringify({ password }) });
}
// Guests play without an account: their island lives on this device only.
const GUEST_KEY = 'jenisland.guest';
export function guestUser(create = false) {
  let id = null;
  try { id = localStorage.getItem(GUEST_KEY); } catch {}
  if (!id && create) { id = 'guest-' + (crypto.randomUUID?.() || Math.random().toString(36).slice(2)); try { localStorage.setItem(GUEST_KEY, id); } catch {} }
  return id ? { id, email: null, local: true, guest: true } : null;
}
export function forgetGuest() { try { localStorage.removeItem(GUEST_KEY); } catch {} }
export async function resume() {
  session = readSession();
  if (!session?.refresh_token || !session.user) { session = null; return null; }
  try { await fresh(); return currentUser(); }
  catch (e) {
    if (e.status && e.status < 500) { session = null; try { localStorage.removeItem(SESSION_KEY); } catch {} return null; }
    return currentUser(); // offline: keep playing on the local save
  }
}
export async function signOut() {
  if (session) await api('/auth/v1/logout', { method: 'POST' }).catch(() => {});
  session = null; try { localStorage.removeItem(SESSION_KEY); } catch {}
}

// Two devices, one island: the server stamps every cloud save with its own clock. A device
// only overwrites the cloud copy it last saw (`lastAt`); if another device saved in
// between, the write is refused with err.conflict so the player can choose.
let lastAt = null;
export const cloudSyncedAt = () => lastAt;
export async function loadCloud() {
  const uid = session.user.id;
  const rows = await api('/rest/v1/jen_island_saves?select=save_data,updated_at&user_id=eq.' + encodeURIComponent(uid));
  const row = rows[0];
  lastAt = row?.updated_at || null;
  return row?.save_data && Object.keys(row.save_data).length ? row.save_data : null;
}
const conflict = () => { const e = new Error('This island was saved from another device'); e.conflict = true; return e; };
// force: overwrite whatever is there (the player chose this device's island, or reset)
export async function saveCloud(state, { keepalive = false, force = false } = {}) {
  const uid = session.user.id, q = 'user_id=eq.' + encodeURIComponent(uid);
  const body = JSON.stringify({ user_id: uid, save_version: state.v || 1, game_day: state.day, coins: Math.round(state.money), reputation: Math.round(state.reputation), save_data: state });
  if (!force && lastAt) {
    const rows = await api(`/rest/v1/jen_island_saves?${q}&updated_at=eq.${encodeURIComponent(lastAt)}&select=updated_at`, { method: 'PATCH', keepalive, headers: { Prefer: 'return=representation' }, body });
    if (!rows?.length) throw conflict();
    lastAt = rows[0].updated_at; return lastAt;
  }
  if (!force) {                                      // never loaded the cloud copy: only write if there isn't one
    const rows = await api(`/rest/v1/jen_island_saves?select=updated_at&${q}`);
    if (rows?.length) throw conflict();
  }
  const rows = await api('/rest/v1/jen_island_saves?on_conflict=user_id&select=updated_at', { method: 'POST', keepalive, headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body });
  lastAt = rows?.[0]?.updated_at || lastAt; return lastAt;
}
// Daily snapshots (the last 7 are kept) so a damaged save can be recovered.
export async function saveSnapshot(state) {
  const uid = session.user.id;
  await api('/rest/v1/jen_island_save_snapshots', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: uid, game_day: state.day, save_version: state.v || 1, save_data: state }) });
  const old = await api('/rest/v1/jen_island_save_snapshots?select=id&user_id=eq.' + encodeURIComponent(uid) + '&order=created_at.desc&offset=7');
  if (old?.length) await api('/rest/v1/jen_island_save_snapshots?id=in.(' + old.map(r => r.id).join(',') + ')', { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
}
// cosmetic purchases (written only by the payment webhook)
export async function loadPurchases() {
  const uid = session.user.id;
  return api('/rest/v1/jen_island_purchases?select=product_id&user_id=eq.' + encodeURIComponent(uid));
}
export async function loadSnapshots() {
  const uid = session.user.id;
  const rows = await api('/rest/v1/jen_island_save_snapshots?select=save_data,created_at&user_id=eq.' + encodeURIComponent(uid) + '&order=created_at.desc&limit=7');
  return (rows || []).map(r => r.save_data).filter(Boolean);
}
export async function saveProfile(playerName, islandName) {
  const uid = session.user.id;
  await api('/rest/v1/jen_island_profiles?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: uid, player_name: playerName.slice(0, 40), island_name: islandName.slice(0, 40), updated_at: new Date().toISOString() }) });
}
export async function saveDailySummary(day, summary) {
  const uid = session.user.id;
  await api('/rest/v1/jen_island_daily_summaries?on_conflict=user_id,game_day', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: uid, game_day: day, summary_data: summary }) });
}
// Global leaderboard: write our own row, read the public ranking (display fields only).
export async function pushLeaderboard(row) {
  const uid = session.user.id;
  await api('/rest/v1/jen_island_leaderboard?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: uid, ...row, updated_at: new Date().toISOString() }) });
}
export async function fetchLeaderboard(sort = 'level') {
  return api('/rest/v1/rpc/jen_island_leaderboard_top', { method: 'POST', body: JSON.stringify({ sort, lim: 50 }) });
}
// Delete account: erases every row this game keeps for the player, and the login.
export async function deleteAccount() {
  return api('/rest/v1/rpc/jen_island_delete_account', { method: 'POST', body: '{}' });
}
// ---- friends (systems/social.js): showcases, friend codes, visits and daily gifts
const SHOW = 'user_id,code,player_name,island_name,level,day,chapter,badge,updated_at';
export async function publishShowcase(row) {
  const rows = await api('/rest/v1/jen_island_showcase?on_conflict=user_id&select=code', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ user_id: session.user.id, ...row }) });
  return rows?.[0]?.code || null;
}
export async function addFriend(code) { return api('/rest/v1/rpc/jen_island_add_friend', { method: 'POST', body: JSON.stringify({ friend_code: code }) }); }
export async function removeFriend(id) { await api(`/rest/v1/jen_island_friends?user_id=eq.${session.user.id}&friend_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); }
export async function listFriends() {
  const rows = await api(`/rest/v1/jen_island_friends?select=friend_id&user_id=eq.${session.user.id}`);
  if (!rows?.length) return [];
  return api(`/rest/v1/jen_island_showcase?select=${SHOW}&user_id=in.(${rows.map(r => r.friend_id).join(',')})&order=updated_at.desc`);
}
export async function friendHome(id) { return (await api(`/rest/v1/jen_island_showcase?select=player_name,island_name,look,home,badge&user_id=eq.${encodeURIComponent(id)}`))?.[0] || null; }
export async function giftsSentToday() { return api(`/rest/v1/jen_island_gifts?select=to_id&from_id=eq.${session.user.id}&sent_on=eq.${new Date().toISOString().slice(0, 10)}`); }
export async function sendGift(to, kind) { await api('/rest/v1/jen_island_gifts', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ from_id: session.user.id, to_id: to, kind }) }); }
export async function giftsWaiting() {
  const rows = await api(`/rest/v1/jen_island_gifts?select=id,kind,from_id&to_id=eq.${session.user.id}&claimed=eq.false&limit=20`);
  if (!rows?.length) return [];
  const names = await api(`/rest/v1/jen_island_showcase?select=user_id,player_name&user_id=in.(${[...new Set(rows.map(r => r.from_id))].join(',')})`);
  return rows.map(r => ({ ...r, from: names.find(n => n.user_id === r.from_id)?.player_name || 'A friend' }));
}
export async function claimGift(id) { const rows = await api(`/rest/v1/jen_island_gifts?id=eq.${id}&claimed=eq.false&select=id`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ claimed: true }) }); return !!rows?.length; }
export const hasSession = () => !!session;
