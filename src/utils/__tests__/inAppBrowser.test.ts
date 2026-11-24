import { describe, it, expect } from 'vitest';
import { detectInAppBrowser } from '../inAppBrowser';

describe('detectInAppBrowser', () => {
  it('detects Messenger in-app browser on iOS and Android', () => {
    const iosMessenger =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21A329 [FBAN/MessengerForiOS;FBAV/430.0.0.45.114]';
    expect(detectInAppBrowser(iosMessenger)).toEqual({ isInApp: true, appName: 'Messenger' });
  });

  it('detects Zalo, Facebook, Instagram, and TikTok webviews', () => {
    expect(detectInAppBrowser('Mozilla/5.0 ... Zalo/24.08.01')).toEqual({ isInApp: true, appName: 'Zalo' });
    expect(detectInAppBrowser('Mozilla/5.0 ... [FBAN/FBIOS;FBAV/450.0]')).toEqual({ isInApp: true, appName: 'Facebook' });
    expect(detectInAppBrowser('Mozilla/5.0 ... Instagram 312.0.0')).toEqual({ isInApp: true, appName: 'Instagram' });
    expect(detectInAppBrowser('Mozilla/5.0 ... BytedanceWebview/d8a21c6')).toEqual({ isInApp: true, appName: 'TikTok' });
  });

  it('returns false for standard Chrome and Safari browsers', () => {
    const chromeDesktop =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    const safariIos =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
    expect(detectInAppBrowser(chromeDesktop)).toEqual({ isInApp: false, appName: null });
    expect(detectInAppBrowser(safariIos)).toEqual({ isInApp: false, appName: null });
  });
});
