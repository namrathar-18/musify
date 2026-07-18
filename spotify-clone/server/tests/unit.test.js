import { describe, it, expect } from 'vitest';
import { normalizeTrack } from '../lib/itunes.js';

describe('normalizeTrack', () => {
  it('maps an iTunes song result into the Track shape', () => {
    const t = normalizeTrack({
      trackId: 123456,
      trackName: 'Test Song',
      artistName: 'Test Artist',
      artistId: 777,
      collectionName: 'Test Album',
      collectionId: 888,
      artworkUrl100: 'https://x/100x100bb.jpg',
      previewUrl: 'https://x/preview.m4a',
      trackTimeMillis: 210000,
      primaryGenreName: 'Pop',
      releaseDate: '2024-06-01T12:00:00Z',
    });

    expect(t).toEqual({
      spotifyId: '123456',
      title: 'Test Song',
      artist: 'Test Artist',
      artistId: '777',
      album: 'Test Album',
      albumId: '888',
      albumArt: 'https://x/300x300bb.jpg', // upgraded to hi-res
      previewUrl: 'https://x/preview.m4a',
      duration: 210000,
      genre: 'Pop',
      releaseDate: '2024-06-01',
    });
  });

  it('tolerates missing fields', () => {
    const t = normalizeTrack({ trackId: 1 });
    expect(t.spotifyId).toBe('1');
    expect(t.title).toBe('');
    expect(t.previewUrl).toBe('');
    expect(t.duration).toBe(0);
    expect(t.releaseDate).toBe('');
  });
});
