import { describe, it, expect } from 'vitest';
import { levelFromXp, BADGES, XP_REWARDS } from '../lib/gamification.js';

describe('levelFromXp', () => {
  it('starts everyone at level 1', () => {
    const l = levelFromXp(0);
    expect(l.level).toBe(1);
    expect(l.progress).toBe(0);
  });

  it('increases monotonically and never regresses', () => {
    let prev = 0;
    for (let xp = 0; xp <= 20000; xp += 137) {
      const { level } = levelFromXp(xp);
      expect(level).toBeGreaterThanOrEqual(prev);
      prev = level;
    }
  });

  it('reports progress between 0 and 1 within a level', () => {
    for (const xp of [0, 50, 302, 303, 900, 5000]) {
      const { progress } = levelFromXp(xp);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    }
  });

  it('places the next threshold above the current XP', () => {
    for (const xp of [0, 100, 1000, 9000]) {
      expect(levelFromXp(xp).nextLevelAt).toBeGreaterThan(xp);
    }
  });
});

describe('badge catalog', () => {
  it('has unique ids and complete metadata', () => {
    const ids = BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of BADGES) {
      expect(b.name).toBeTruthy();
      expect(b.description).toBeTruthy();
      expect(b.icon).toBeTruthy();
      expect(typeof b.check).toBe('function');
    }
  });

  it('awards nothing to a brand-new account', () => {
    const empty = {
      plays: 0, genres: 0, nightPlays: 0, streak: 0, playlists: 0,
      likes: 0, quizGames: 0, quizHighScore: 0, xp: 0, level: 1,
    };
    expect(BADGES.filter((b) => b.check(empty))).toHaveLength(0);
  });

  it('awards the expected badges for an active listener', () => {
    const active = {
      plays: 120, genres: 6, nightPlays: 2, streak: 8, playlists: 5,
      likes: 60, quizGames: 4, quizHighScore: 5, xp: 4000, level: 10,
    };
    const earned = BADGES.filter((b) => b.check(active)).map((b) => b.id);
    expect(earned).toContain('audiophile-100');
    expect(earned).toContain('streak-7');
    expect(earned).toContain('quiz-master');
    expect(earned).toContain('level-10');
    expect(earned.length).toBe(BADGES.length); // this profile clears them all
  });
});

describe('XP rewards', () => {
  it('values deliberate actions above passive ones', () => {
    expect(XP_REWARDS.playlistCreated).toBeGreaterThan(XP_REWARDS.play);
    expect(XP_REWARDS.quizPerfect).toBeGreaterThan(XP_REWARDS.quizCorrect);
    for (const v of Object.values(XP_REWARDS)) expect(v).toBeGreaterThan(0);
  });
});
