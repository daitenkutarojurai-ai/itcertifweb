/**
 * engine/ads.js
 * 
 * All functions are no-ops until ADS_ENABLED = true and AdMob is configured.
 * Flip ADS_ENABLED to true when Capacitor AdMob plugin is installed.
 */

const ADS_ENABLED = false; // ← flip when ready

export async function showInterstitial() {
  if (!ADS_ENABLED) return;
  // TODO: await AdMob.showInterstitial();
  console.log('[Ads] Interstitial stub called');
}

export async function showRewarded() {
  if (!ADS_ENABLED) return false;
  // TODO: const result = await AdMob.showRewardVideoAd();
  console.log('[Ads] Rewarded stub called');
  return false;
}
