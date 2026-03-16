# Swampy Stories Episode Explorer

A map-first explorer for **Swampy Stories** episodes in real Florida locations.

## What it does

- Loads the fixed Swampy Stories feed (`https://feed.podbean.com/swampystories/feed.xml`).
- Extracts artwork + descriptions from each feed item.
- Uses manually verified episode-to-location mappings for all current episodes.
- Places episodes on a zoomable/pannable Leaflet map with artwork-based pins.
- Includes a "River Rescue Prototype" mini-game page linked from the header.

## Run locally

```bash
./run-local.sh
```

Or:

```bash
python -m http.server 4173
```

Then open: <http://localhost:4173>

## Full testing

See `TESTING.md` for a complete browser + command-line validation checklist.

## Episode location mappings

- Spring Portal Episode 1 → Kelly Park (Apopka)
- Bread Heist → Moss Park (Kissimmee)
- Swamp Rodeo → Orlando Wetlands Park
- Mangrove Magic → Honeymoon Island State Park (Dunedin)
- Mushu and the Stolen Pontoon → Blue Spring State Park (Orange City)
- Swampy Lullaby → Newton Park (Lake Apopka)
- Raspy → Monkey Jungle (South Florida)
- Raining Iguanas → Miami Beach
- The Magic Acorn → Tucker's Ranch (Winter Garden)
- Silver Spring Showdown → Silver Springs State Park (Ocala)
