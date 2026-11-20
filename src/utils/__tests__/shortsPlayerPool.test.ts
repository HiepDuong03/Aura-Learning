import { describe, it, expect } from 'vitest';
import {
  computePoolAssignments,
  getPoolSlotForIndex,
  planSlotAction,
  PoolSlotRuntime
} from '../shortsPlayerPool';

describe('shortsPlayerPool (TikTok 3-Slot Sliding Window)', () => {
  const feed = [
    { id: 'c0', youtubeId: 'vidA', startSeconds: 10 },
    { id: 'c1', youtubeId: 'vidB', startSeconds: 25 },
    { id: 'c2', youtubeId: 'vidB', startSeconds: 60 },
    { id: 'c3', youtubeId: 'vidC', startSeconds: 5 }
  ];

  it('assigns distinct slots for [prev, active, next] and rotates smoothly without colliding', () => {
    const at0 = computePoolAssignments(0, feed);
    expect(at0[0].role).toBe('active');
    expect(at0[0].clip?.clipId).toBe('c0');
    expect(at0[1].role).toBe('next');
    expect(at0[1].clip?.clipId).toBe('c1');
    expect(at0[2].role).toBe('idle');

    // Swiping forward to index 1: slot 1 becomes active (already prewarmed), slot 0 stays prev, slot 2 prewarms c2
    const at1 = computePoolAssignments(1, feed);
    expect(at1[1].role).toBe('active');
    expect(at1[1].clip?.clipId).toBe('c1');
    expect(at1[0].role).toBe('prev');
    expect(at1[0].clip?.clipId).toBe('c0');
    expect(at1[2].role).toBe('next');
    expect(at1[2].clip?.clipId).toBe('c2');

    // Swiping forward to index 2: slot 2 becomes active, slot 1 stays prev, slot 0 recycles for c3
    const at2 = computePoolAssignments(2, feed);
    expect(at2[2].role).toBe('active');
    expect(at2[1].role).toBe('prev');
    expect(at2[0].role).toBe('next');
    expect(at2[0].clip?.clipId).toBe('c3');
  });

  it('handles small feeds (1 or 2 items) cleanly with active taking priority', () => {
    const oneItem = computePoolAssignments(0, [feed[0]]);
    expect(oneItem[0].role).toBe('active');
    expect(oneItem[1].role).toBe('idle');
    expect(oneItem[2].role).toBe('idle');
    expect(getPoolSlotForIndex(0)).toBe(0);
    expect(getPoolSlotForIndex(4)).toBe(1);
  });

  it('chooses noop-ready for pre-warmed clips and reuse-seek for same YouTube video at a new timestamp', () => {
    const prewarmed: PoolSlotRuntime = {
      clipId: 'c1',
      youtubeId: 'vidB',
      startSeconds: 25,
      isReady: true,
      isPrewarmed: true
    };

    expect(
      planSlotAction(prewarmed, { feedIndex: 1, clipId: 'c1', youtubeId: 'vidB', startSeconds: 25 })
    ).toBe('noop-ready');

    // Same YouTube video at a different timestamp -> instant seekTo instead of loadVideoById
    expect(
      planSlotAction(prewarmed, { feedIndex: 2, clipId: 'c2', youtubeId: 'vidB', startSeconds: 60 })
    ).toBe('reuse-seek');

    // Different YouTube video -> loadVideoById
    expect(
      planSlotAction(prewarmed, { feedIndex: 3, clipId: 'c3', youtubeId: 'vidC', startSeconds: 5 })
    ).toBe('load');
  });
});
