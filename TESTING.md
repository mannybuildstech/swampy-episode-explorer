# Swampy Stories Explorer - Full Testing Guide

This project is a static web app, so you only need a local web server and a browser.

## 1) Start the app locally

### Option A (recommended): helper script

```bash
./run-local.sh
```

### Option B: direct Python command

```bash
python -m http.server 4173
```

Then open:

- <http://localhost:4173>

---

## 2) Quick sanity checks

Run these in a second terminal:

```bash
node --check app.js
curl -I http://localhost:4173
```

Expected:

- `node --check app.js` exits with code `0` and no syntax errors.
- `curl -I` returns `HTTP/1.0 200 OK` (or `HTTP/1.1 200 OK`).

---

## 3) In-browser functional test checklist

After opening the app in your browser:

1. **Map loads and is interactive**
   - You can pan by dragging.
   - You can zoom with mouse wheel +/- controls.

2. **Episode pins appear as images**
   - Pins are circular artwork images (not default blue Leaflet pins).
   - Clicking a pin opens a popup with title, location text, and artwork.

3. **Episode list is hidden by default**
   - The side list is not shown initially.
   - Click **Show Episode List** to open it.
   - Click **Hide Episode List** to close it.

4. **All mapped episodes are present**
   - Status text should report loaded mapped episodes.
   - List entries should include title, location, and description snippet.

5. **Map viewport focuses Florida episode spread**
   - Initial viewport should include the mapped markers after load.

---

## 4) Network/fetch fallback verification (optional)

The app first tries to fetch the feed directly:

- `https://feed.podbean.com/swampystories/feed.xml`

If blocked by CORS/network policy, it falls back to:

- `https://api.allorigins.win/raw?url=<encoded-feed-url>`

To inspect this:

1. Open browser devtools → **Network** tab.
2. Reload the page.
3. Verify one of the feed requests succeeds.

---

## 5) Common issues

- **Blank page / no styles**: ensure you started a server in project root (not opening `index.html` via `file://`).
- **No episodes**: check console errors and network availability to feed/proxy endpoints.
- **Port busy**: run `./run-local.sh 5173` and open <http://localhost:5173>.
