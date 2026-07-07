# Spotify Playlist Manager --- Ultimate Mixtape (UMP)

## Complete Product Specification (Version 2)

## ROLE

You are a senior software architect, senior UI/UX designer, desktop
application developer, backend engineer, and DevOps engineer.

You are responsible for planning, designing, implementing, documenting,
and testing the complete application.

Think of this as a commercial desktop application that will be used
daily.

Whenever there are multiple implementation choices, choose the solution
that is scalable, maintainable, performant, secure, visually polished,
and intuitive. Never sacrifice code quality for speed.

## PRIMARY GOAL

Create a desktop application that allows me to synchronize songs between
Spotify playlists.

The application should eliminate the need to manually copy songs into my
master playlist called **Ultimate Mixtape (UMP)**.

Instead of being a simple script, the application should function like
professional software similar to Notion, Discord, Spotify, or GitHub
Desktop.

## PROJECT OBJECTIVES

-   Authenticate with Spotify
-   Display every playlist
-   Cache playlist data
-   Work offline
-   Synchronize playlists
-   Detect duplicates
-   Save reusable sync profiles
-   Execute scheduled syncs
-   Maintain detailed logs
-   Be easy to extend

## DESIGN PHILOSOPHY

1.  Simplicity
2.  Speed
3.  Reliability
4.  Transparency

## TARGET PLATFORMS

Primary: - Windows - macOS

Secondary: - Linux

## TECH STACK

Recommend and justify: - Desktop framework - Programming language - UI
framework - Spotify SDK/API library - Database - Cache - Scheduler -
Logging - Packaging - Dependency management - Configuration format

## USER INTERFACE

Professional desktop UI with: - Dark & Light mode - Responsive layout -
Native menus - Keyboard shortcuts - Smooth animations - Rounded
corners - Search everywhere

## MAIN WINDOW

Top Navigation

Left Sidebar

Main Workspace

Bottom Status Bar

### Sidebar

-   Dashboard
-   Playlists
-   Sync
-   Scheduled Jobs
-   History
-   Favorites
-   Settings
-   Help

### Dashboard

Display: - Playlist count - Song count - Favorites - Last sync - Recent
activity - Scheduled jobs - Connection status - Spotify account info -
Cache usage

### Playlist Browser

Show playlist: - Artwork - Name - Owner - Song count - Description -
Last synced - Favorite - Sync status

Support instant search and sorting.

### Playlist Selection

Use cards with checkboxes.

Support: - Multi-select - Shift select - Ctrl select - Select All -
Invert Selection - Search - Favorites

### Synchronization Screen

Left: Source Playlists

Right: Destination Playlists

Center visualization

Preview panel below.

## PREVIEW

Before syncing calculate: - Songs to add - Existing songs - Ignored
songs - Duplicates - Estimated API calls - Estimated time - Warnings

Require confirmation.

## SYNC ENGINE

Support: - Copy - Merge - Mirror - Update Only - Backup - Simulation -
Incremental - Smart Sync

## DUPLICATE DETECTION

Priority: 1. Spotify Track ID 2. ISRC 3. Artist 4. Title 5. Album 6.
Duration tolerance

Ignore formatting differences.

## AUTOMATION

Support: - Startup - Hourly - Daily - Weekly - Monthly - Custom
schedule - Manual

## OFFLINE MODE

Cache: - Metadata - Artwork - Song info - Logs - Settings - Profiles

Queue sync jobs for later execution.

## SETTINGS

Theme Language Animations Cache Notifications Auto Update Backup
Developer Mode

## LOGGING

Record: - Time - Duration - API calls - Songs added - Removed -
Skipped - Errors - Warnings

Export: - CSV - JSON - TXT

## HISTORY

Allow: - Restore - Repeat - Compare - Delete - Export

## SEARCH

Global search across playlists, songs, artists, history, settings and
profiles.

## PERFORMANCE

Support: - 100+ playlists - 20,000+ songs - Lazy loading - Virtual
scrolling - Batch API calls - Automatic retries

## ERROR HANDLING

Recover from: - Internet loss - Spotify downtime - Rate limits - Expired
tokens - Corrupted cache - Missing permissions

## SECURITY

Secure OAuth. Encrypt tokens. Never hardcode secrets.

## TESTING

Generate: - Unit tests - Integration tests - UI tests - Stress tests

## PROJECT STRUCTURE

Separate: - UI - Core - API - Models - Services - Authentication -
Database - Cache - Logging - Tests - Documentation

## DOCUMENTATION

Generate: - README - Installation Guide - Developer Guide - Architecture
Overview - API Documentation - Troubleshooting

## FUTURE EXPANSION

Architecture should support future integrations: - Apple Music - YouTube
Music - Tidal - Deezer - Plex - Jellyfin

## IMPLEMENTATION STRATEGY

Implement in phases.

1.  Architecture
2.  UI Design
3.  Project Structure
4.  Database
5.  Authentication
6.  Playlist Discovery
7.  Sync Engine
8.  Desktop UI
9.  Offline Mode
10. Scheduled Sync
11. Logging
12. Testing
13. Packaging
14. Documentation

At the end of every phase: - Explain design decisions. - Summarize
work. - Wait for approval before continuing.
