import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { cached } from './cache.js';

// Parses a podcast's public RSS feed into a clean episode list. Podcast RSS is
// openly published by design, so full episodes are streamable legally — unlike
// music, which is capped at 30s previews.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
});

const toArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);

// itunes:duration comes as seconds ("1832") or "hh:mm:ss" / "mm:ss".
const parseDurationMs = (raw) => {
  if (raw == null) return 0;
  const s = String(raw).trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10) * 1000;
  const parts = s.split(':').map((n) => parseInt(n, 10) || 0);
  return parts.reduce((acc, n) => acc * 60 + n, 0) * 1000;
};

const stripHtml = (html) =>
  String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const getEpisodes = (feedUrl, limit = 30) =>
  cached(`podcast-feed-${feedUrl}`, 60 * 60 * 1000, async () => {
    const { data } = await axios.get(feedUrl, {
      timeout: 15000,
      responseType: 'text',
      // Some podcast hosts reject default axios UA
      headers: { 'User-Agent': 'Musify/2.0 (podcast client)' },
      maxContentLength: 10 * 1024 * 1024,
    });

    const xml = parser.parse(data);
    const channel = xml?.rss?.channel;
    if (!channel) return { description: '', episodes: [] };

    const channelImage =
      channel['itunes:image']?.['@href'] || channel.image?.url || '';

    const episodes = toArray(channel.item)
      .slice(0, limit)
      .map((item, i) => {
        const enclosure = toArray(item.enclosure)[0];
        const audioUrl = enclosure?.['@url'] || '';
        if (!audioUrl) return null;
        const guid =
          (typeof item.guid === 'object' ? item.guid['#text'] : item.guid) ||
          `${feedUrl}#${i}`;
        return {
          id: String(guid),
          title: String(item.title || 'Untitled episode'),
          description: stripHtml(item['itunes:summary'] || item.description).slice(0, 500),
          audioUrl,
          duration: parseDurationMs(item['itunes:duration']),
          publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : null,
          image: item['itunes:image']?.['@href'] || channelImage,
        };
      })
      .filter(Boolean);

    return {
      description: stripHtml(channel['itunes:summary'] || channel.description).slice(0, 800),
      episodes,
    };
  });
