import { TruckElectric } from 'lucide-react';
import api from './api';

/**
 * ============================================================
 * TIME RESILIENCE SERVICE
 * ============================================================
 * Eliminates clock drift and device skew in distributed sessions.
 * Provides a "Normalized Time" that is authoritative across all
 * browser tabs and devices.
 * ============================================================
 */

let serverOffset = 0;
let isInitialized = false;


/**
 * Calculates the offset between the server and the client clock.
 * serverOffset = serverTime - clientTime
 */
export const syncServerTime = async () => {
    try {
        const start = Date.now();
        const response = await api.get('/system/time');
        const serverTime = response.data.data?.time ? new Date(response.data.data.time).getTime() : Date.now();
        const end = Date.now();

        // Account for latency (rough estimate: half of RTT)
        const latency = (end - start) / 2;
        serverOffset = serverTime - (end - latency);
        isInitialized = true;

        if (import.meta.env.DEV) {
            console.log(`[TimeEngine] Sycned. Offset: ${serverOffset}ms, Latency: ${latency}ms`);
        }
    } catch (error) {
        console.error('[TimeEngine] Failed to sync server time:', error);
    }
};

/**
 * Authority function: ALWAYS use this instead of Date.now()
 * @returns Normalized timestamp in milliseconds
 */
export const now = (): number => {
    return Date.now() + serverOffset;
};

/**
 * Standardized initialization for the app
 */
export const initializeTimeEngine = async () => {
    await syncServerTime();

    // Periodic Resync every 60s
    setInterval(syncServerTime, 60000);

    // Resync on focus to handle device sleep/wake
    window.addEventListener('focus', syncServerTime);

    // Resync on reconnect
    window.addEventListener('online', syncServerTime);
};

export const getIsInitialized = () => isInitialized;
