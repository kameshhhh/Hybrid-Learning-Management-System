import { now } from './time';

/**
 * ============================================================
 * DEFENSIVE SYNC SERVICE
 * ============================================================
 * Guarantees delivery of progress state under unreliable 
 * transport conditions. Implements Beacon-Fetch-Queue hierarchy.
 * ============================================================
 */

interface SyncPayload {
    skillId: string;
    dayId: string;
    blockId: string;
    progress: number;
    timestamp: number;
    syncId: string;
    sessionId: string;
}

const SYNC_QUEUE_KEY = 'hlms_pending_syncs';
const MAX_QUEUE_SIZE = 100;
const SYNC_API_URL = `${import.meta.env.VITE_API_URL || '/api/v1'}/student/sync-progress`;

/**
 * Persistence layer: Safe localStorage write
 */
const saveQueueToDisk = (queue: SyncPayload[]) => {
    try {
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
        console.error('[SyncEngine] LocalStorage full?', e);
    }
};

/**
 * Retrieval layer: Get and sort by timestamp to ensure monotonic replay
 */
const getQueueFromDisk = (): SyncPayload[] => {
    try {
        const data = localStorage.getItem(SYNC_QUEUE_KEY);
        if (!data) return [];
        const queue: SyncPayload[] = JSON.parse(data);
        // CRITICAL: Always sort by timestamp before processing
        return queue.sort((a, b) => a.timestamp - b.timestamp);
    } catch (e) {
        return [];
    }
};

/**
 * Core Transport Strategy: TIERED SYNC
 * Implementation: Beacon (Level 1) -> Keepalive Fetch (Level 2) -> Retry Queue (Level 3)
 */
export const syncProgress = async (payload: SyncPayload, options: { force?: boolean } = {}) => {
    // 1. Always queue locally first (Defensive Persistence)
    let queue = getQueueFromDisk();
    
    // De-duplicate: if same blockId already in queue, update it
    queue = queue.filter(item => item.blockId !== payload.blockId);
    queue.push(payload);
    
    // Overflow Protection: Cap queue size to prevent LocalStorage exhaustion
    if (queue.length > MAX_QUEUE_SIZE) {
        queue = queue.slice(-MAX_QUEUE_SIZE);
    }
    saveQueueToDisk(queue);

    // 2. Transport Phase
    // Use minimal payload for Beacon to respect 64KB limits
    const minimalPayload = {
        blockId: payload.blockId,
        progress: payload.progress,
        timestamp: payload.timestamp,
        syncId: payload.syncId,
        skillId: payload.skillId
    };
    const jsonPayload = JSON.stringify(minimalPayload);

    if (options.force || document.hidden) {
        // Level 1: Navigator Beacon (Primary exit transport)
        if (navigator.sendBeacon) {
            const success = navigator.sendBeacon(SYNC_API_URL, jsonPayload);
            if (success) return; 
        }
        
        // Level 2: Fetch Keepalive (Secondary exit transport)
        try {
            await fetch(SYNC_API_URL, {
                method: 'POST',
                body: jsonPayload,
                headers: { 'Content-Type': 'application/json' },
                keepalive: true
            });
        } catch (e) {
             // Silently fail, it's already in the Level 3 Queue
        }
    } else {
        // Standard Async Fetch
        try {
            const response = await fetch(SYNC_API_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }
            });
            if (response.ok) {
                // Only clear from Level 3 Queue on explicit server ACK
                const currentQueue = getQueueFromDisk().filter(item => item.syncId !== payload.syncId);
                saveQueueToDisk(currentQueue);
            }
        } catch (e) {
            // Keep in queue for background retry
        }
    }
};

/**
 * RECONCILIATION: Retry all queued syncs
 * Call this on app initialization.
 */
export const replayPendingSyncs = async () => {
    const queue = getQueueFromDisk();
    if (queue.length === 0) return;

    if (import.meta.env.DEV) {
        console.log(`[SyncEngine] Replaying ${queue.length} pending syncs...`);
    }

    const remainingItems = [...queue];

    for (const item of queue) {
        try {
            const response = await fetch(SYNC_API_URL, {
                method: 'POST',
                body: JSON.stringify(item),
                headers: { 'Content-Type': 'application/json' }
            });
            if (response.ok) {
                const idx = remainingItems.findIndex(i => i.syncId === item.syncId);
                if (idx > -1) remainingItems.splice(idx, 1);
            }
        } catch (e) {
            break; // Network still down, stop replaying
        }
    }

    saveQueueToDisk(remainingItems);
};
