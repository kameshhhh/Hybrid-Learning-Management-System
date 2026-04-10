// Device information interface
export interface DeviceInfo {
  userAgent: string;
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  ip: string;
  location?: string;
}

// Detect device type from user agent
export function detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
  if (/mobile/i.test(userAgent)) return 'mobile';
  if (/tablet/i.test(userAgent)) return 'tablet';
  return 'desktop';
}

// Detect browser from user agent
export function detectBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  return 'Unknown';
}

// Detect OS from user agent
export function detectOS(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  return 'Unknown';
}

// Parse device info from request
export function parseDeviceInfo(req: any): DeviceInfo {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  
  return {
    userAgent,
    browser: detectBrowser(userAgent),
    os: detectOS(userAgent),
    deviceType: detectDeviceType(userAgent),
    ip: Array.isArray(ip) ? ip[0] : ip,
  };
}

// Format device info for storage (JSON string)
export function formatDeviceInfoForStorage(deviceInfo: DeviceInfo): string {
  return JSON.stringify({
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    deviceType: deviceInfo.deviceType,
    userAgent: deviceInfo.userAgent,
  });
}
