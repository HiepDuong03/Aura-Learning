export interface InAppBrowserInfo {
  isInApp: boolean;
  appName: string | null;
}

const IN_APP_PATTERNS: Array<{ pattern: RegExp; appName: string }> = [
  { pattern: /FBAN\/Messenger|FB_IAB.*Messenger|Messenger/i, appName: 'Messenger' },
  { pattern: /Zalo/i, appName: 'Zalo' },
  { pattern: /Instagram/i, appName: 'Instagram' },
  { pattern: /FBAN|FBAV|FB_IAB/i, appName: 'Facebook' },
  { pattern: /\bLine\//i, appName: 'LINE' },
  { pattern: /BytedanceWebview|musical_ly|TikTok/i, appName: 'TikTok' }
];

export function detectInAppBrowser(userAgent?: string): InAppBrowserInfo {
  const ua =
    typeof userAgent === 'string'
      ? userAgent
      : typeof navigator !== 'undefined'
        ? navigator.userAgent
        : '';

  if (!ua) {
    return { isInApp: false, appName: null };
  }

  for (const entry of IN_APP_PATTERNS) {
    if (entry.pattern.test(ua)) {
      return { isInApp: true, appName: entry.appName };
    }
  }

  return { isInApp: false, appName: null };
}
