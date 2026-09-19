import AsyncStorage from '@react-native-async-storage/async-storage';
import { DashboardResponse, NotificacionPendienteItem } from './api';

export const CACHE_KEYS = {
  DASHBOARD_DATA: '@mivotry_dashboard_data',
  DASHBOARD_TIMESTAMP: '@mivotry_dashboard_timestamp',
  PENDING_NOTIFS: '@mivotry_pending_notifs',
} as const;

export interface CachedDashboardResult {
  data: DashboardResponse;
  timestamp: number;
  ageMinutes: number;
}

/**
 * Persists dashboard response and updates synchronization timestamp.
 */
export async function saveCachedDashboard(data: DashboardResponse): Promise<void> {
  try {
    const timestamp = Date.now();
    await AsyncStorage.multiSet([
      [CACHE_KEYS.DASHBOARD_DATA, JSON.stringify(data)],
      [CACHE_KEYS.DASHBOARD_TIMESTAMP, timestamp.toString()],
    ]);
  } catch (error) {
    console.error('[CacheService] Error saving cached dashboard:', error);
  }
}

/**
 * Retrieves the cached dashboard data along with sync epoch timestamp and age in minutes.
 * Returns null if no cache is present or upon parsing/storage failure.
 */
export async function getCachedDashboard(): Promise<CachedDashboardResult | null> {
  try {
    const pairs = await AsyncStorage.multiGet([
      CACHE_KEYS.DASHBOARD_DATA,
      CACHE_KEYS.DASHBOARD_TIMESTAMP,
    ]);

    const dataEntry = pairs.find(([k]) => k === CACHE_KEYS.DASHBOARD_DATA);
    const timestampEntry = pairs.find(([k]) => k === CACHE_KEYS.DASHBOARD_TIMESTAMP);

    const rawData = dataEntry ? dataEntry[1] : null;
    const rawTimestamp = timestampEntry ? timestampEntry[1] : null;

    if (!rawData) {
      return null;
    }

    const data: DashboardResponse = JSON.parse(rawData);
    const timestamp = rawTimestamp ? parseInt(rawTimestamp, 10) : 0;
    const now = Date.now();
    const ageMinutes = Math.max(0, Math.floor((now - timestamp) / (1000 * 60)));

    return {
      data,
      timestamp,
      ageMinutes,
    };
  } catch (error) {
    console.error('[CacheService] Error getting cached dashboard:', error);
    return null;
  }
}

/**
 * Persists pending notification items to local cache.
 */
export async function saveCachedPendingNotifications(notifs: NotificacionPendienteItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.PENDING_NOTIFS, JSON.stringify(notifs));
  } catch (error) {
    console.error('[CacheService] Error saving cached pending notifications:', error);
  }
}

/**
 * Retrieves cached pending notification items.
 * Returns null if no cached items exist or upon error.
 */
export async function getCachedPendingNotifications(): Promise<NotificacionPendienteItem[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.PENDING_NOTIFS);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as NotificacionPendienteItem[];
  } catch (error) {
    console.error('[CacheService] Error getting cached pending notifications:', error);
    return null;
  }
}

/**
 * Clears all cached Mivotry offline data.
 */
export async function clearCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      CACHE_KEYS.DASHBOARD_DATA,
      CACHE_KEYS.DASHBOARD_TIMESTAMP,
      CACHE_KEYS.PENDING_NOTIFS,
    ]);
  } catch (error) {
    console.error('[CacheService] Error clearing cache:', error);
  }
}

/**
 * Checks if the cached dashboard data was saved within the specified threshold (default: 15 minutes).
 * Returns false if no timestamp exists, if timestamp is invalid, or if error occurs.
 */
export async function isCacheFresh(ageMinutesThreshold: number = 15): Promise<boolean> {
  try {
    const rawTimestamp = await AsyncStorage.getItem(CACHE_KEYS.DASHBOARD_TIMESTAMP);
    if (!rawTimestamp) {
      return false;
    }
    const timestamp = parseInt(rawTimestamp, 10);
    if (isNaN(timestamp) || timestamp <= 0) {
      return false;
    }

    const ageMs = Date.now() - timestamp;
    const thresholdMs = ageMinutesThreshold * 60 * 1000;
    return ageMs >= 0 && ageMs < thresholdMs;
  } catch (error) {
    console.error('[CacheService] Error checking cache freshness:', error);
    return false;
  }
}

export const cacheService = {
  saveCachedDashboard,
  getCachedDashboard,
  saveCachedPendingNotifications,
  getCachedPendingNotifications,
  clearCache,
  isCacheFresh,
};

export default cacheService;
