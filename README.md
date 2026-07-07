# Spot Playmaker --- Ultimate Mixtape (UMP) Sync Agent

A professional-grade desktop application built with Electron, React, and TypeScript to automate Spotify playlist management and track synchronization. 

Instead of manually maintaining your master playlist (like **Ultimate Mixtape (UMP)**), this app enables you to define sync relationships, filter tracks (excluding explicit songs, local files, long tracks, or filtering by popularity and year), run dry run simulations, and execute bulk synchronizations either manually or on automated schedules.

---

## Technical Architecture & Stack

Spot Playmaker separates operations into a highly secure, offline-first architecture:

- **Desktop Host:** **Electron v31** orchestrates application window states, filesystem caching, secure credentials, and native OS APIs.
- **Frontend App:** **React v18, TypeScript, and Vite** build a fast, reactive UI.
- **Styling Design System:** Built using **Vanilla CSS with Custom Properties** (no CSS framework bloat), implementing dark-first Glassmorphism, smooth micro-interactions, responsive grids, and standard browser-scrollbars with WebKit fallbacks.
- **API Client:** Native fetch client with auto-paginating playlist handlers, batching writes in units of 100 tracks, and rate-limit (`429`) parsing utilizing the `Retry-After` header.
- **Local DB & Caching:** Filesystem flat-file database written atomically to avoid corruption. Caches playlist snapshots and song listings, enabling **100% offline operations** and sync queuing.
- **Automation Scheduler:** In-memory cron checker that fires scheduled sync profiles (Hourly, Daily, Weekly, Startup) and recovers queued offline tasks automatically upon reconnection.

---

## File Structure

```text
pewdiepie-archdaemon/odysseus/
├── dist/                          # Compiled production bundles
├── data/                          # Development local db directory
├── src/
│   ├── main/                      # Electron Main Process (Node)
│   │   ├── main.ts                # App lifecycle and IPC router
│   │   ├── preload.ts             # Secure IPC Preload bridge
│   │   ├── db.ts                  # Local storage and cache DB manager
│   │   ├── spotify.ts             # Spotify HTTP callback server & API client
│   │   ├── sync.ts                # Sync Engine (modes, filters, duplicate matcher)
│   │   └── scheduler.ts           # Background sync scheduler & connectivity monitor
│   │
│   └── renderer/                  # React Frontend Process (Vite)
│       ├── index.html             # HTML entry shell with theme injector
│       ├── main.tsx               # React bootstrapper
│       ├── vite-env.d.ts          # TypeScript global window API overrides
│       ├── index.css              # Glassmorphic layout design tokens & variables
│       ├── App.tsx                # Sidebar shell, alerts, and progress popup
│       │
│       └── components/            # Interface panels
│           ├── Dashboard.tsx      # Metrics, logs summaries, quick-run profile list
│           ├── PlaylistBrowser.tsx# Covers grid, sorting filters, track preview modal
│           ├── SyncManager.tsx    # Source/destination picks, mode selects, dry-run modal
│           ├── SyncProfiles.tsx   # Saved sync configurations, scheduler configurations
│           ├── HistoryViewer.tsx  # Logs list, expandable traces, JSON/CSV exports
│           ├── Settings.tsx       # Auth status panel, Developer ID inputs, theme switch
│           └── Help.tsx           # User guide and explanations
│
├── package.json                   # Script definitions and dependency trees
├── tsconfig.json                  # Frontend TypeScript configuration
├── tsconfig.main.json             # Backend TypeScript configuration
└── vite.config.ts                 # Vite compiler configurations
```

---

## Installation & Setup

### 1. Prerequisites
- **Node.js:** v18.x or newer (Tested on v25.7.0)
- **npm:** v9.x or newer (Tested on v11.16.0)

### 2. Dependency Installation
Clone the workspace and run:
```bash
npm install
```

### 3. Create Spotify Developer App
To sync playlists, you need to register a developer app on Spotify:
1. Log in to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Click **Create App**.
3. Set the app name and description of your choice.
4. Set the **Redirect URI** to: `http://127.0.0.1:8888/callback` (Must be exact).
5. Accept developer terms and click **Save**.
6. Open your App settings to retrieve your **Client ID** and **Client Secret**.

---

## Run and Build Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Launch the concurrent Vite server and Electron shell in development mode. |
| `npm run build` | Compiles the main TS process and bundles the React code for production. |
| `npm run compile-main` | Fast compile check of the Electron backend process. |
| `npm start` | Launches the pre-built application binary without running Vite HMR. |

---

## Synchronization Features

### Sync Modes
1. **Update Only (Recommended):** Compares destination tracks against sources. Adds newly discovered tracks. Never deletes existing tracks from destination playlists.
2. **Merge:** Gathers tracks from all sources, performs duplicate checks, and writes the unique set to destinations. No deletions.
3. **Mirror:** Forces destinations to become identical to source playlists. **Removes songs from the destination that do not exist in the source.**
4. **Copy:** Appends all source tracks to destinations. Does not check for existing duplicates.

### Duplicate Detection Rules
Tracks are classified as duplicates if:
- They share the exact same **Spotify Track ID**.
- **Fallback Match:** The normalized track title matches, the normalized artist names match, and the duration is within a **2-second tolerance** range. Capitalization, parentheses `(remasters)`, and brackets `[remixes]` are automatically ignored during normalization.

### Smart Filters
Exclude tracks based on:
- Explicit content tags.
- Local audio files import markers.
- Long-format tracks (podcasts, set lists) exceeding 15 minutes.
- Popularity index scores (1-100 threshold).
- Custom release year range bounds.
