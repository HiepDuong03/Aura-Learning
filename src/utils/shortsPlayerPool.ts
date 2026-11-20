export type PoolSlotId = 0 | 1 | 2;
export type PoolSlotRole = 'active' | 'next' | 'prev' | 'idle';
export type PoolSlotAction = 'noop-ready' | 'reuse-seek' | 'load' | 'idle';

export interface PoolClipSpec {
  feedIndex: number;
  clipId: string;
  youtubeId: string;
  startSeconds: number;
}

export interface PoolSlotAssignment {
  slotId: PoolSlotId;
  role: PoolSlotRole;
  clip: PoolClipSpec | null;
}

export interface PoolSlotRuntime {
  clipId: string | null;
  youtubeId: string | null;
  startSeconds: number;
  isReady: boolean;
  isPrewarmed: boolean;
}

/**
 * Deterministic 3-slot ring mapping (TikTok Sliding Window [N-1, N, N+1]).
 * Guarantees index N-1, N, and N+1 always occupy 3 distinct persistent player slots
 * so swiping forward lands on the already pre-buffered slot and swiping back lands
 * on the warm cached slot with zero DOM recreation.
 */
export function getPoolSlotForIndex(feedIndex: number): PoolSlotId {
  return (((feedIndex % 3) + 3) % 3) as PoolSlotId;
}

/**
 * Computes assignments for all 3 player slots given the current active feed index.
 */
export function computePoolAssignments(
  activeIndex: number,
  clips: Array<{ id: string; youtubeId: string; startSeconds?: number }>
): Record<PoolSlotId, PoolSlotAssignment> {
  const result: Record<PoolSlotId, PoolSlotAssignment> = {
    0: { slotId: 0, role: 'idle', clip: null },
    1: { slotId: 1, role: 'idle', clip: null },
    2: { slotId: 2, role: 'idle', clip: null }
  };

  if (!clips.length || activeIndex < 0 || activeIndex >= clips.length) {
    return result;
  }

  const assign = (idx: number, role: PoolSlotRole) => {
    const item = clips[idx];
    if (!item || !item.youtubeId) return;
    const slotId = getPoolSlotForIndex(idx);
    result[slotId] = {
      slotId,
      role,
      clip: {
        feedIndex: idx,
        clipId: item.id,
        youtubeId: item.youtubeId,
        startSeconds: typeof item.startSeconds === 'number' && !isNaN(item.startSeconds) ? item.startSeconds : 0
      }
    };
  };

  // Assign prev & next first, then active last so active always wins when feed length <= 2
  if (activeIndex - 1 >= 0) {
    assign(activeIndex - 1, 'prev');
  }
  if (activeIndex + 1 < clips.length) {
    assign(activeIndex + 1, 'next');
  }
  assign(activeIndex, 'active');

  return result;
}

/**
 * Decides the fastest operation to sync a persistent YT.Player slot to its target clip:
 * - 'noop-ready': exact clip is already pre-buffered at startSeconds -> instant playVideo()
 * - 'reuse-seek': same YouTube video is already loaded -> instant seekTo(startSeconds, true)
 * - 'load': different YouTube video -> loadVideoById()
 * - 'idle': no clip assigned
 */
export function planSlotAction(
  runtime: PoolSlotRuntime,
  target: PoolClipSpec | null
): PoolSlotAction {
  if (!target) return 'idle';
  if (!runtime.youtubeId) return 'load';

  const sameVideo = runtime.youtubeId === target.youtubeId;
  const sameStart = Math.abs(runtime.startSeconds - target.startSeconds) < 0.4;

  if (sameVideo && sameStart && (runtime.isPrewarmed || runtime.isReady)) {
    return 'noop-ready';
  }
  if (sameVideo) {
    return 'reuse-seek';
  }
  return 'load';
}
