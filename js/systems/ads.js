// Optional rewarded ads: once a day, after the day's summary, a player may choose to watch
// a short ad to double that day's tips. Never forced, never in the middle of play.
//
// Provider: AppLovin MAX, inside the App Store / Google Play app (the Capacitor build loads
// the official cordova-plugin-applovin-max). Fill in ADS.max once the AppLovin account
// exists: the SDK key and one rewarded ad unit per platform. On the website there are no
// ads; a local copy plays a short pretend ad so the flow can be tried.

import { T } from './state.js';
import { devHost } from '../core/util.js';

export const ADS = {
  max: { sdkKey: '', rewarded: { ios: '', android: '' } },
};
const local = devHost();

// ---------------------------------------------------------------- AppLovin MAX (in the app)
const platform = () => window.Capacitor?.getPlatform?.() || (/android/i.test(navigator.userAgent) ? 'android' : /iphone|ipad/i.test(navigator.userAgent) ? 'ios' : 'web');
const plugin = () => { try { return window.AppLovinMAX || window.cordova?.require?.('cordova-plugin-applovin-max.AppLovinMAX') || null; } catch { return null; } };
const unit = () => ADS.max.rewarded[platform()] || '';
let max = null;                                  // { sdk, ready } once initialised
let pending = null;                              // the ad being watched: { rewarded, done }
function initMax() {
  const sdk = plugin();
  if (max || !sdk || !ADS.max.sdkKey || !unit()) return;
  max = { sdk, ready: false };
  const load = () => sdk.loadRewardedAd(unit());
  addEventListener('OnRewardedAdLoadedEvent', () => { max.ready = true; });
  addEventListener('OnRewardedAdLoadFailedEvent', () => { max.ready = false; setTimeout(load, 30000); });
  addEventListener('OnRewardedAdReceivedRewardEvent', () => { if (pending) pending.rewarded = true; });
  addEventListener('OnRewardedAdFailedToDisplayEvent', () => { max.ready = false; pending?.done(false); load(); });
  addEventListener('OnRewardedAdHiddenEvent', () => { max.ready = false; pending?.done(pending.rewarded); load(); });
  sdk.initialize(ADS.max.sdkKey, () => load());
}
// call once at startup (does nothing on the website or before the keys are set)
export function initAds() { if (document.readyState === 'complete') initMax(); else addEventListener('load', initMax); document.addEventListener('deviceready', initMax); }
export const adsReady = () => !!max?.ready || local;

// resolves true only when the ad was watched to the end
export function showRewarded() {
  if (max?.ready && max.sdk.isRewardedAdReady(unit())) {
    return new Promise(res => {
      pending = { rewarded: false, done: ok => { pending = null; res(ok); } };
      max.sdk.showRewardedAd(unit());
    });
  }
  if (!local) return Promise.resolve(false);
  return new Promise(res => {                      // a pretend ad for local testing
    const el = document.createElement('div'); el.className = 'modal';
    el.innerHTML = `<div class="card" style="text-align:center"><h2>${T('Test ad', 'Quảng cáo thử')}</h2><p style="font-weight:800">${T('A real ad would play here.', 'Quảng cáo thật sẽ phát ở đây.')}</p><b class="cd" style="font-size:28px">3</b></div>`;
    document.getElementById('app').appendChild(el);
    let n = 3; const iv = setInterval(() => { n--; el.querySelector('.cd').textContent = n; if (n <= 0) { clearInterval(iv); el.remove(); res(true); } }, 1000);
  });
}
