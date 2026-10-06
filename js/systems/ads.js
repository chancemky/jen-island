// Optional rewarded ads: once a day, after the day's summary, a player may choose to watch
// a short ad to double that day's tips. Never forced, never in the middle of play.
//
// Provider: Google H5 Games Ads (AdSense's Ad Placement API, adBreak type 'reward') once
// ADS.client holds the AdSense publisher id ('ca-pub-…'). Until then a local copy plays a
// short pretend ad so the flow can be tried, and the live site offers nothing.

import { T } from './state.js';

export const ADS = { client: '' };
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
export const adsReady = () => !!ADS.client || local;

let loading = null;
function loadH5() {
  loading ||= new Promise((res, rej) => {
    window.adsbygoogle = window.adsbygoogle || [];
    window.adBreak = window.adConfig = o => window.adsbygoogle.push(o);
    const s = document.createElement('script');
    s.async = true; s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS.client}`;
    s.dataset.adFrequencyHint = '30s';
    s.onload = () => { window.adConfig({ preloadAdBreaks: 'on', sound: 'on' }); res(); };
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return loading;
}
// resolves true only when the whole ad was watched
export async function showRewarded(name = 'reward') {
  if (ADS.client) {
    try { await loadH5(); } catch { return false; }
    return new Promise(res => {
      let viewed = false;
      window.adBreak({ type: 'reward', name, beforeReward: show => show(), adViewed: () => { viewed = true; }, adDismissed: () => {}, adBreakDone: () => res(viewed) });
    });
  }
  if (!local) return false;
  return new Promise(res => {                      // a pretend ad for local testing
    const el = document.createElement('div'); el.className = 'modal';
    el.innerHTML = `<div class="card" style="text-align:center"><h2>${T('Test ad', 'Quảng cáo thử')}</h2><p style="font-weight:800">${T('A real ad would play here.', 'Quảng cáo thật sẽ phát ở đây.')}</p><b class="cd" style="font-size:28px">3</b></div>`;
    document.getElementById('app').appendChild(el);
    let n = 3; const iv = setInterval(() => { n--; el.querySelector('.cd').textContent = n; if (n <= 0) { clearInterval(iv); el.remove(); res(true); } }, 1000);
  });
}
