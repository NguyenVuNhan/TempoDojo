const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
]);

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

// Core libs have no DOM or Node types, so the link is parsed by hand rather than with URL.
const LINK_RE = /^(?:[a-zA-Z][a-zA-Z\d+\-.]*:\/\/)?([^/?#\s]+)([^?#\s]*)(?:\?([^#\s]*))?(?:#\S*)?$/;

function queryParam(query: string | undefined, name: string): string | null {
  for (const pair of (query ?? '').split('&')) {
    const [key, value = ''] = pair.split('=');
    if (key === name) return value;
  }
  return null;
}

/** Extracts a valid 11-character YouTube video ID from a link, or returns null. */
export function parseYoutubeId(url: string): string | null {
  const m = LINK_RE.exec(url.trim());
  if (!m) return null;
  const host = m[1].toLowerCase().replace(/:\d+$/, '');
  if (!YOUTUBE_HOSTS.has(host)) return null;
  const path = m[2];

  let candidate: string | null = null;
  if (host === 'youtu.be') {
    candidate = path.split('/').filter(Boolean)[0] ?? null;
  } else if (path === '/watch' || path === '/watch/') {
    candidate = queryParam(m[3], 'v');
  } else {
    candidate = /^\/(?:shorts|embed|live)\/([^/]+)/.exec(path)?.[1] ?? null;
  }

  return candidate && YOUTUBE_ID_RE.test(candidate) ? candidate : null;
}
