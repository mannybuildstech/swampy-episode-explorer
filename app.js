const FEED_URL = 'https://feed.podbean.com/swampystories/feed.xml';

const statusEl = document.getElementById('status');

const map = L.map('map', {
  zoomControl: true,
  minZoom: 6,
  maxZoom: 18
}).setView([28.1, -81.6], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const manualEpisodeLocations = {
  'spring portal episode 1': { place: 'Kelly Park, Apopka, Florida', coords: [28.7612, -81.503] },
  'spring portal': { place: 'Kelly Park, Apopka, Florida', coords: [28.7612, -81.503] },
  'bread heist': { place: 'Moss Park, Kissimmee, Florida', coords: [28.3461, -81.1576] },
  'swamp rodeo': { place: 'Orlando Wetlands Park, Christmas, Florida', coords: [28.5424, -80.9954] },
  'mangrove magic': { place: 'Honeymoon Island State Park, Dunedin, Florida', coords: [28.0718, -82.8258] },
  'mushu and the stolen pontoon': { place: 'Blue Spring State Park, Orange City, Florida', coords: [28.9459, -81.3399] },
  'mooshoo and the stolen pontoon': { place: 'Blue Spring State Park, Orange City, Florida', coords: [28.9459, -81.3399] },
  'swampy lullaby': { place: 'Newton Park, Lake Apopka, Florida', coords: [28.6207, -81.5607] },
  raspy: { place: 'Monkey Jungle, South Florida (Miami area)', coords: [25.5609, -80.4983] },
  'raining iguanas': { place: 'Miami Beach, Florida', coords: [25.7907, -80.13] },
  'the magic acorn': { place: "Tucker's Ranch, Winter Garden, Florida", coords: [28.5737, -81.5949] },
  'silver springs showdown': { place: 'Silver Springs State Park, Ocala, Florida', coords: [29.2098, -82.0223] },
  'silver spring showdown': { place: 'Silver Springs State Park, Ocala, Florida', coords: [29.2098, -82.0223] }
};

const fallbackImage = 'https://placehold.co/300x300?text=Swampy+Stories';
let markers = [];
const geocodeCache = new Map();

function textFromHtml(html = '') {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

function textWithLineBreaksFromHtml(html = '') {
  const normalizedHtml = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n');
  const parser = new DOMParser();
  const doc = parser.parseFromString(normalizedHtml, 'text/html');

  return (doc.body.textContent || '')
    .replace(/\r/g, '')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

function parseBasedOnLocation(...rawParts) {
  const merged = rawParts.filter(Boolean).join('\n');
  const text = textWithLineBreaksFromHtml(merged);

  const inlinePattern = /Based on\s+location:\s*([^\n,]+?)\s*,\s*([^\n]+)/i;
  const inlineMatch = text.match(inlinePattern);
  if (inlineMatch) {
    const locationTitle = inlineMatch[1].trim();
    const locationAddress = inlineMatch[2].trim();
    return {
      title: locationTitle,
      address: locationAddress,
      place: `${locationTitle}, ${locationAddress}`
    };
  }

  const labelPattern = /Based on\s+location:\s*(.+?)\s*(?:Address|Location address)[:\-]\s*([^\n]+)/i;
  const labelMatch = text.match(labelPattern);
  if (labelMatch) {
    const locationTitle = labelMatch[1].trim();
    const locationAddress = labelMatch[2].trim();
    return {
      title: locationTitle,
      address: locationAddress,
      place: `${locationTitle}, ${locationAddress}`
    };
  }

  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const locationLine = lines.findIndex(line => /^Based on\s+location:\s*$/i.test(line));

  if (locationLine === -1) return null;

  const locationTitle = lines[locationLine + 1] || '';
  const locationAddress = lines[locationLine + 2] || '';
  if (!locationTitle || !locationAddress) return null;

  return {
    title: locationTitle,
    address: locationAddress,
    place: `${locationTitle}, ${locationAddress}`
  };
}

function extractPlatformLinks(item, rawDescription = '') {
  const contentEncoded = item.getElementsByTagName('content:encoded')[0]?.textContent || '';
  const guid = item.getElementsByTagName('guid')[0]?.textContent || '';
  const link = item.getElementsByTagName('link')[0]?.textContent || '';
  const candidates = [rawDescription, contentEncoded, guid, link].filter(Boolean).join(' ');

  const appleMatch = candidates.match(/https?:\/\/[^\s"'<>]*apple\.com[^\s"'<>]*/i);
  const spotifyMatch = candidates.match(/https?:\/\/[^\s"'<>]*spotify\.com[^\s"'<>]*/i);

  return {
    apple: appleMatch?.[0] || '',
    spotify: spotifyMatch?.[0] || '',
    fallback: link || guid || ''
  };
}

function isAppleDevice() {
  return /iPad|iPhone|iPod|Macintosh/i.test(navigator.userAgent);
}

function isAndroidOrWindowsDevice() {
  return /Android|Windows/i.test(navigator.userAgent);
}

function preferredEpisodeUrl(episode) {
  if (isAppleDevice() && episode.appleUrl) return episode.appleUrl;
  if (isAndroidOrWindowsDevice() && episode.spotifyUrl) return episode.spotifyUrl;
  return episode.appleUrl || episode.spotifyUrl || episode.fallbackUrl || '';
}

function preferredMapsUrl(addressOrPlace) {
  const query = encodeURIComponent(addressOrPlace);
  if (isAppleDevice()) return `https://maps.apple.com/?q=${query}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

async function geocodeLocation(addressOrPlace) {
  const query = (addressOrPlace || '').trim();
  if (!query) return null;

  if (geocodeCache.has(query)) return geocodeCache.get(query);

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json'
      }
    });
    if (!response.ok) {
      console.warn('[Swampy] Geocoding failed', { query, status: response.status });
      geocodeCache.set(query, null);
      return null;
    }

    const result = await response.json();
    const top = Array.isArray(result) ? result[0] : null;
    if (!top?.lat || !top?.lon) {
      geocodeCache.set(query, null);
      return null;
    }

    const coords = [Number(top.lat), Number(top.lon)];
    geocodeCache.set(query, coords);
    return coords;
  } catch (error) {
    console.warn('[Swampy] Geocoding error', { query, error });
    geocodeCache.set(query, null);
    return null;
  }
}

function extractImage(item) {
  const itunesImg = item.getElementsByTagName('itunes:image')[0]?.getAttribute('href');
  if (itunesImg) return itunesImg;

  const encoded = item.getElementsByTagName('content:encoded')[0]?.textContent || '';
  const imgMatch = encoded.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];

  const description = item.getElementsByTagName('description')[0]?.textContent || '';
  const descImg = description.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (descImg) return descImg[1];

  return fallbackImage;
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/\(ft\.?[^)]*\)/g, '')
    .replace(/\bft\.?\s+[^-–—|]+$/g, '')
    .replace(/[^a-z0-9\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveEpisodeLocation(title) {
  const normalized = normalizeTitle(title);
  if (manualEpisodeLocations[normalized]) {
    return { key: normalized, location: manualEpisodeLocations[normalized] };
  }

  const aliases = [
    ['silver spring showdown', 'silver springs showdown'],
    ['mushu and the stolen pontoon', 'mooshoo and the stolen pontoon'],
    ['spring portal episode 1', 'spring portal'],
    ['raspy', 'raspy ft rafa']
  ];

  for (const [manualKey, candidateKey] of aliases) {
    if (normalized === candidateKey || normalized.includes(candidateKey)) {
      return { key: manualKey, location: manualEpisodeLocations[manualKey] };
    }
  }

  const fuzzyMatch = Object.keys(manualEpisodeLocations).find(key => normalized.includes(key));
  if (fuzzyMatch) {
    return { key: fuzzyMatch, location: manualEpisodeLocations[fuzzyMatch] };
  }

  return { key: normalized, location: null };
}

function clearMarkers() {
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
}

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function imageIcon(imageUrl) {
  return L.divIcon({
    className: '',
    html: `<img class="episode-pin" src="${imageUrl}" alt="episode pin"/>`,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -22]
  });
}

function buildPopupContent(episode) {
  const safeTitle = escapeHtml(episode.title);
  const safePlace = escapeHtml(episode.place);
  const safeDescription = escapeHtml(episode.description || 'No description available.');
  const safeEpisodeUrl = episode.preferredUrl ? escapeHtml(episode.preferredUrl) : '';
  const safeMapsUrl = escapeHtml(preferredMapsUrl(episode.address || episode.place));

  return `
    <article class="popup-card">
      <h3>${safeTitle}</h3>
      <p class="popup-location">📍 ${safePlace}</p>
      <p class="popup-description">${safeDescription}</p>
      <div class="popup-actions">
        ${safeEpisodeUrl ? `<a class="popup-button popup-button-primary" href="${safeEpisodeUrl}" target="_blank" rel="noopener noreferrer">Open Episode</a>` : ''}
        <a class="popup-button popup-button-secondary" href="${safeMapsUrl}" target="_blank" rel="noopener noreferrer">Visit Park</a>
      </div>
    </article>
  `;
}

async function fetchXml() {
  const direct = await fetch(FEED_URL);
  if (direct.ok) return direct.text();

  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(FEED_URL)}`;
  const proxied = await fetch(proxyUrl);
  if (!proxied.ok) {
    throw new Error(`Unable to fetch feed (${direct.status}/${proxied.status}).`);
  }

  return proxied.text();
}

async function loadEpisodes() {
  statusEl.textContent = 'Loading episodes…';
  clearMarkers();

  try {
    const xml = await fetchXml();
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const items = [...doc.getElementsByTagName('item')];
    const seenTitles = new Set();

    const episodes = [];

    for (const item of items) {
      const title = item.getElementsByTagName('title')[0]?.textContent?.trim() || 'Untitled';
      const normalizedTitle = normalizeTitle(title);

      if (seenTitles.has(normalizedTitle)) continue;
      seenTitles.add(normalizedTitle);

      const rawDescription = item.getElementsByTagName('description')[0]?.textContent || '';
      const contentEncoded = item.getElementsByTagName('content:encoded')[0]?.textContent || '';
      const summary = item.getElementsByTagName('itunes:summary')[0]?.textContent || '';
      const parsedLocation = parseBasedOnLocation(rawDescription, contentEncoded, summary);
      console.log('[Swampy] Parsed episode metadata', {
        title,
        parsedLocation,
        hasDescription: Boolean(rawDescription),
        hasContentEncoded: Boolean(contentEncoded),
        hasSummary: Boolean(summary)
      });

      const { location } = resolveEpisodeLocation(title);
      let coords = location?.coords || null;
      const place = parsedLocation?.place || location?.place || '';
      const address = parsedLocation?.address || location?.place || '';

      if (!coords && (address || place)) {
        const geocodeQuery = address || place;
        console.log('[Swampy] Geocoding episode location', { title, geocodeQuery });
        coords = await geocodeLocation(geocodeQuery);
      }

      if (!coords) {
        console.log('[Swampy] Episode missing coordinates after geocoding, skipping marker', {
          title,
          normalizedTitle,
          parsedLocation
        });
        continue;
      }

      const links = extractPlatformLinks(item, [rawDescription, contentEncoded, summary].join(' '));
      const description = textFromHtml(rawDescription).slice(0, 320);

      episodes.push({
        title,
        description,
        image: extractImage(item),
        place,
        address,
        coords,
        preferredUrl: preferredEpisodeUrl({
          appleUrl: links.apple,
          spotifyUrl: links.spotify,
          fallbackUrl: links.fallback
        })
      });
    }

    for (const episode of episodes) {
      const marker = L.marker(episode.coords, { icon: imageIcon(episode.image) }).addTo(map);
      marker.bindPopup(buildPopupContent(episode), {
        maxWidth: 300,
        className: 'episode-popup'
      });
      markers.push(marker);
    }

    if (markers.length) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }

    statusEl.textContent = '';
    console.log(`[Swampy] Loaded ${episodes.length} mapped episodes.`);
  } catch (error) {
    console.error(error);
    statusEl.textContent = `Failed to load feed: ${error.message}`;
  }
}

loadEpisodes();
