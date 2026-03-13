const FEED_URL = 'https://feed.podbean.com/swampystories/feed.xml';

const statusEl = document.getElementById('status');
const listEl = document.getElementById('episodeList');
const template = document.getElementById('episodeTemplate');
const episodePane = document.getElementById('episodePane');
const toggleListBtn = document.getElementById('toggleListBtn');
const mainEl = document.querySelector('main');

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
  'spring portal episode 1': {
    place: 'Kelly Park, Apopka, Florida',
    coords: [28.7612, -81.5030]
  },
  'spring portal': {
    place: 'Kelly Park, Apopka, Florida',
    coords: [28.7612, -81.5030]
  },
  'bread heist': {
    place: 'Moss Park, Kissimmee, Florida',
    coords: [28.3461, -81.1576]
  },
  'swamp rodeo': {
    place: 'Orlando Wetlands Park, Christmas, Florida',
    coords: [28.5424, -80.9954]
  },
  'mangrove magic': {
    place: 'Honeymoon Island State Park, Dunedin, Florida',
    coords: [28.0718, -82.8258]
  },
  'mushu and the stolen pontoon': {
    place: 'Blue Spring State Park, Orange City, Florida',
    coords: [28.9459, -81.3399]
  },
  'mooshoo and the stolen pontoon': {
    place: 'Blue Spring State Park, Orange City, Florida',
    coords: [28.9459, -81.3399]
  },
  'swampy lullaby': {
    place: 'Newton Park, Lake Apopka, Florida',
    coords: [28.6207, -81.5607]
  },
  'raspy': {
    place: 'Monkey Jungle, South Florida (Miami area)',
    coords: [25.5609, -80.4983]
  },
  'raining iguanas': {
    place: 'Miami Beach, Florida',
    coords: [25.7907, -80.1300]
  },
  'the magic acorn': {
    place: "Tucker's Ranch, Winter Garden, Florida",
    coords: [28.5737, -81.5949]
  },
  'silver springs showdown': {
    place: 'Silver Springs State Park, Ocala, Florida',
    coords: [29.2098, -82.0223]
  },
  'silver spring showdown': {
    place: 'Silver Springs State Park, Ocala, Florida',
    coords: [29.2098, -82.0223]
  }
};

const fallbackImage = 'https://placehold.co/300x300?text=Swampy+Stories';
let markers = [];

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
  const merged = rawParts.filter(Boolean).join("\n");
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

function renderEpisode(episode) {
  const node = template.content.cloneNode(true);
  const imageEl = node.querySelector('.episode-image');
  imageEl.src = episode.image;
  imageEl.alt = `${episode.title} artwork`;
  imageEl.style.cursor = episode.preferredUrl ? 'pointer' : 'default';
  if (episode.preferredUrl) {
    imageEl.addEventListener('click', () => {
      window.open(episode.preferredUrl, '_blank', 'noopener,noreferrer');
    });
  }
  node.querySelector('.episode-title').textContent = episode.title;
  node.querySelector('.episode-location').textContent = `📍 ${episode.place}`;
  node.querySelector('.episode-description').textContent = episode.description || 'No description available.';
  listEl.appendChild(node);
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
  listEl.innerHTML = '';
  clearMarkers();

  try {
    const xml = await fetchXml();
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const items = [...doc.getElementsByTagName('item')];
    console.log('[Swampy] Feed items retrieved:', items.length);

    const seenTitles = new Set();

    const episodes = items
      .map(item => {
        const title = item.getElementsByTagName('title')[0]?.textContent?.trim() || 'Untitled';
        const normalizedTitle = normalizeTitle(title);

        if (seenTitles.has(normalizedTitle)) {
          console.log('[Swampy] Skipping duplicate episode:', title);
          return null;
        }
        seenTitles.add(normalizedTitle);

        const { key, location } = resolveEpisodeLocation(title);
        if (!location) {
          console.warn('[Swampy] No location match for episode:', { title, normalizedTitle, key });
          return null;
        }

        const rawDescription = item.getElementsByTagName('description')[0]?.textContent || '';
        const contentEncoded = item.getElementsByTagName('content:encoded')[0]?.textContent || '';
        const summary = item.getElementsByTagName('itunes:summary')[0]?.textContent || '';
        const parsedLocation = parseBasedOnLocation(rawDescription, contentEncoded, summary);
        const links = extractPlatformLinks(item, [rawDescription, contentEncoded, summary].join(' '));
        const description = textFromHtml(rawDescription).slice(0, 420);
        const image = extractImage(item);
        const preferredUrl = preferredEpisodeUrl({
          appleUrl: links.apple,
          spotifyUrl: links.spotify,
          fallbackUrl: links.fallback
        });

        console.log('[Swampy] Episode parsed:', {
          title,
          matchedLocationKey: key,
          parsedAddress: parsedLocation?.address || '(not parsed)',
          fallbackPlace: location.place
        });

        if (!parsedLocation) {
          const rawText = textWithLineBreaksFromHtml([rawDescription, contentEncoded, summary].join('\n'));
          console.warn('[Swampy] Could not parse `Based on location` block from feed text:', {
            title,
            tailPreview: rawText.slice(-260)
          });
        }

        return {
          title,
          description,
          image,
          place: parsedLocation?.place || location.place,
          parsedAddress: parsedLocation?.address || '',
          coords: location.coords,
          appleUrl: links.apple,
          spotifyUrl: links.spotify,
          fallbackUrl: links.fallback,
          preferredUrl
        };
      })
      .filter(Boolean);

    console.log('[Swampy] Total mapped episodes after filtering:', episodes.length);

    for (const episode of episodes) {
      renderEpisode(episode);

      const marker = L.marker(episode.coords, { icon: imageIcon(episode.image) }).addTo(map);
      const popupImage = episode.preferredUrl
        ? `<a href="${episode.preferredUrl}" target="_blank" rel="noopener noreferrer"><img src="${episode.image}" alt="${episode.title}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;margin-top:6px;cursor:pointer;"/></a>`
        : `<img src="${episode.image}" alt="${episode.title}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;margin-top:6px;"/>`;
      marker.bindPopup(`
        <strong>${episode.title}</strong><br/>
        ${episode.place}<br/>
        ${popupImage}
      `);
      markers.push(marker);
    }

    if (markers.length) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }

    statusEl.textContent = `Loaded ${episodes.length} mapped episodes.`;
  } catch (error) {
    console.error(error);
    statusEl.textContent = `Failed to load feed: ${error.message}`;
  }
}

toggleListBtn.addEventListener('click', () => {
  const willShow = episodePane.classList.contains('hidden');
  episodePane.classList.toggle('hidden', !willShow);
  episodePane.setAttribute('aria-hidden', String(!willShow));
  toggleListBtn.setAttribute('aria-expanded', String(willShow));
  toggleListBtn.textContent = willShow ? 'Hide Episode List' : 'Show Episode List';
  mainEl.classList.toggle('with-pane', willShow);
  setTimeout(() => map.invalidateSize(), 120);
});

loadEpisodes();
