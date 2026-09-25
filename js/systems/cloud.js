// Supabase over plain REST. Only the publishable key ships to the browser;
// row-level security on the jen_island_* tables restricts every row to its
// owner (see supabase/migrations). This game never touches other tables.

export const CLOUD = { url: 'https://cgbaigeergwvbmghrakb.supabase.co', key: 'sb_publishable_w1-MKpH0ysDz_nXEt25cXA_n_1H5DBo' };
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

export function currentUser() { return session?.user ? { id: session.user.id, email: session.user.email } : null; }

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

export async function loadCloud() {
  const uid = session.user.id;
  const rows = await api('/rest/v1/jen_island_saves?select=save_data,updated_at&user_id=eq.' + encodeURIComponent(uid));
  return rows[0]?.save_data && Object.keys(rows[0].save_data).length ? rows[0].save_data : null;
}
export async function saveCloud(state, { keepalive = false } = {}) {
  const uid = session.user.id;
  const body = { user_id: uid, save_version: state.v || 1, game_day: state.day, coins: Math.round(state.money), reputation: Math.round(state.reputation), save_data: state, updated_at: new Date().toISOString() };
  await api('/rest/v1/jen_island_saves?on_conflict=user_id', { method: 'POST', keepalive, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(body) });
}
export async function saveProfile(playerName, islandName) {
  const uid = session.user.id;
  await api('/rest/v1/jen_island_profiles?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: uid, player_name: playerName.slice(0, 40), island_name: islandName.slice(0, 40), updated_at: new Date().toISOString() }) });
}
export async function saveDailySummary(day, summary) {
  const uid = session.user.id;
  await api('/rest/v1/jen_island_daily_summaries?on_conflict=user_id,game_day', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: uid, game_day: day, summary_data: summary }) });
}
export const hasSession = () => !!session;
