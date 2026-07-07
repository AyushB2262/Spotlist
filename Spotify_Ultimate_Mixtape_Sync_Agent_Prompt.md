# Spotify Ultimate Mixtape Sync Agent

## Role

I want you to act as a senior software engineer and software architect.
Design and build a polished desktop application (AI Agent) from scratch
that automates Spotify playlist management.

The application should be designed as if it were a real consumer
product, not just a proof of concept. It should have a modern UI, clean
architecture, proper error handling, and well-documented code.

## Project Goal

The purpose of this application is to synchronize songs between my
Spotify playlists.

I have many playlists based on genres, moods, movies, games, artists,
etc., but I also maintain one master playlist called **Ultimate Mixtape
(UMP)**.

Instead of manually copying songs from multiple playlists into UMP, I
want this application to automate the process.

The application should work with my own Spotify account.

## Connectivity

### Offline

-   Application launches normally.
-   Previously loaded playlists remain visible.
-   UI remains fully functional.
-   User can prepare sync jobs.
-   Queued operations execute automatically when internet returns.

### Online

-   Authenticate with Spotify.
-   Load all playlists.
-   Read playlist contents.
-   Add songs.
-   Remove songs (only when requested).
-   Refresh playlists.

## Spotify Authentication

Implement Spotify OAuth securely.

-   Store tokens securely.
-   Avoid repeated logins unless tokens expire or permissions are
    revoked.

## Playlist Discovery

Automatically fetch: - Every playlist created by me - Every saved
playlist - Followed playlists - Collaborative playlists (if supported)

Display: - Playlist name - Number of songs - Playlist image - Playlist
owner - Last updated (if available)

Support searching and sorting by: - Alphabetical - Song count - Recently
updated - Created by me - Saved playlists

## Main UI

### Left Panel --- Source Playlists

Playlists from which songs will be exported.

Features: - Multi-select - Search - Select All - Deselect All - Playlist
preview - Song count

### Right Panel --- Destination Playlists

Playlists that receive imported songs.

Features: - Multi-select - Search - Select All - Deselect All - Playlist
preview - Song count

Example:

LEFT - ☑ Rock - ☑ Movie OST - ☑ Chill - ☐ Jazz

RIGHT - ☑ Ultimate Mixtape - ☑ Road Trip

Support: - Many source playlists → Many destination playlists

## Sync Modes

### Copy

Copies songs while leaving source playlists unchanged.

### Mirror

Makes destination playlists identical to selected source playlists.
Optionally remove songs not present in the source after confirmation.

### Merge

Merge songs from all selected source playlists while automatically
removing duplicates.

### Update Only (Preferred)

Only import newly discovered songs. Never remove existing songs.

## Duplicate Detection

Never create duplicate songs.

Primary detection: - Spotify Track ID

Fallback: - Artist - Song Title - Album

Ignore capitalization differences.

## Sync Preview

Before syncing display: - Songs to Add - Songs Already Exist -
Duplicates Found - Songs Skipped - Estimated Total

Require confirmation before execution.

## Smart Filtering

Optional filters: - Only liked songs - Exclude explicit songs - Exclude
podcasts - Exclude local files - Minimum popularity - Song duration -
Release year - Genre (if available)

## Progress Window

Display: - Progress bar - Current playlist - Current song - Percentage
complete - Estimated remaining time - Cancel safely

## Logging

Maintain logs including: - Date - Time - Songs copied - Songs skipped -
Errors - Authentication issues

Allow exporting logs.

## Automatic Sync

Support: - Hourly - Daily - Weekly - On startup - Manual only

## Sync Profiles

Allow saving reusable profiles.

Example:

Profile: Daily UMP Update

Source: - Rock - Movie OST - Anime - Games

Destination: - Ultimate Mixtape

Mode: - Update Only

Profiles should execute with one click.

## User Experience

Provide: - Modern UI - Dark mode - Light mode - Responsive layout -
Resizable window - Smooth animations - Keyboard shortcuts - Remember
previous selections - Drag-and-drop where appropriate

## Safety Features

-   Confirmation before destructive actions
-   Undo where possible
-   Prevent accidental deletion
-   Never overwrite playlists silently

## Performance

Efficiently support: - 100+ playlists - 10,000+ songs - Large
playlists - API rate limits - Batch operations - Automatic retry on
transient failures

## Error Handling

Gracefully recover from: - Internet disconnects - Expired tokens -
Spotify API failures - Rate limiting - Private playlists - Network
interruptions - Unexpected crashes

## Architecture

Use a clean, scalable architecture separating: - UI - Spotify API -
Authentication - Sync Engine - Configuration - Database / Cache -
Logging - Utilities

## Documentation

Generate: - Project structure - Installation guide - Setup guide -
Dependency list - README - Environment variable documentation - Build
instructions - Packaging instructions

## Nice-to-Have Features

-   Playlist comparison
-   Statistics dashboard
-   Playlist backup & restore
-   CSV / JSON export
-   CSV import
-   Favorite playlists
-   Recently used playlists
-   Search across all playlists
-   Duplicate playlist detection
-   Sync history
-   Dry Run mode

## Final Goal

Build a professional-grade Spotify Playlist Manager rather than a simple
script.

Prioritize: - Reliability - Performance - Maintainability -
Scalability - Excellent user experience

Whenever architectural decisions are required, choose the most robust
long-term solution and explain major design decisions before
implementation.
