import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const APP_VERSION = 'v1.4.0';
export const APP_VERSION_CODE = 140;
const SEEN_KEY = 'ffid-seen-version-code';

export interface AppRelease {
  id: string;
  version: string;
  version_code: number;
  apk_path: string | null;
  apk_external_url: string | null;
  release_notes: string | null;
  min_android: string | null;
  size_mb: number | null;
  created_at: string;
}

export interface DeviceInfo {
  os: 'android' | 'ios' | 'windows' | 'mac' | 'other';
  osLabel: string;
  androidVersion: number | null;
  isMobile: boolean;
  standalone: boolean;
  browser: string;
}

export const detectDevice = (): DeviceInfo => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const androidMatch = ua.match(/Android\s+([\d.]+)/i);
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const os: DeviceInfo['os'] = isAndroid
    ? 'android'
    : isIOS
      ? 'ios'
      : /Windows/i.test(ua)
        ? 'windows'
        : /Mac OS X/i.test(ua)
          ? 'mac'
          : 'other';
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /OPR\//i.test(ua)
      ? 'Opera'
      : /Chrome\//i.test(ua)
        ? 'Chrome'
        : /Firefox\//i.test(ua)
          ? 'Firefox'
          : /Safari\//i.test(ua)
            ? 'Safari'
            : 'Browser';
  return {
    os,
    osLabel:
      os === 'android'
        ? `Android ${androidMatch?.[1] ?? ''}`.trim()
        : os === 'ios'
          ? 'iPhone / iPad'
          : os === 'windows'
            ? 'Windows PC'
            : os === 'mac'
              ? 'Mac'
              : 'Unknown device',
    androidVersion: androidMatch ? parseFloat(androidMatch[1]) : null,
    isMobile: isAndroid || isIOS,
    standalone:
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true),
    browser,
  };
};

export const useAppRelease = () => {
  const [release, setRelease] = useState<AppRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [device] = useState<DeviceInfo>(() => detectDevice());
  const [seenCode, setSeenCode] = useState<number>(() => {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SEEN_KEY) : null;
    return raw ? Number(raw) : APP_VERSION_CODE;
  });

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_releases')
        .select('*')
        .eq('is_published', true)
        .order('version_code', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setRelease((data as unknown as AppRelease) ?? null);
      setCheckedAt(new Date());
    } catch (e) {
      console.error('Error checking app version:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const latestCode = release?.version_code ?? APP_VERSION_CODE;
  const updateAvailable = latestCode > APP_VERSION_CODE;
  const unseenUpdate = updateAvailable && latestCode > seenCode;

  const markSeen = useCallback(() => {
    localStorage.setItem(SEEN_KEY, String(latestCode));
    setSeenCode(latestCode);
  }, [latestCode]);

  /** Resolve a usable download link (signed URL for uploaded builds). */
  const getDownloadUrl = useCallback(async (): Promise<string | null> => {
    if (!release) return null;
    if (release.apk_path) {
      const { data, error } = await supabase.storage
        .from('app-builds')
        .createSignedUrl(release.apk_path, 60 * 30, { download: true });
      if (!error && data?.signedUrl) return data.signedUrl;
    }
    return release.apk_external_url ?? null;
  }, [release]);

  const compatible =
    device.os !== 'android'
      ? null
      : device.androidVersion == null || !release?.min_android
        ? true
        : device.androidVersion >= parseFloat(release.min_android);

  return {
    release,
    loading,
    check,
    checkedAt,
    device,
    compatible,
    updateAvailable,
    unseenUpdate,
    markSeen,
    getDownloadUrl,
    installedVersion: APP_VERSION,
  };
};

export default useAppRelease;
