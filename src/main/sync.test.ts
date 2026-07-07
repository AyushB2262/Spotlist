import assert from 'assert';
import { SyncEngine } from './sync';
import { TrackCache } from './db';

console.log('--------------------------------------------------');
console.log('Running Sync Engine Unit Tests...');
console.log('--------------------------------------------------');

let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ Passed: ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`✗ Failed: ${name}`);
    console.error(err.message);
    failedTests++;
  }
}

// 1. Normalization Tests
test('String Normalization', () => {
  assert.strictEqual(SyncEngine.normalizeString('Test Song (Remastered)'), 'testsong');
  assert.strictEqual(SyncEngine.normalizeString('Test Song [2024 Mix]'), 'testsong');
  assert.strictEqual(SyncEngine.normalizeString('Test Song feat. Drake'), 'testsong');
  assert.strictEqual(SyncEngine.normalizeString('S.O.S.!!!'), 'sos');
  assert.strictEqual(SyncEngine.normalizeString('   Space  Song   '), 'spacesong');
  assert.strictEqual(SyncEngine.normalizeString(''), '');
});

// 2. Duplicate Detection: Match by ID
test('Equal Tracks by Spotify ID', () => {
  const trackA: TrackCache = {
    id: 'track123',
    name: 'Song A',
    artists: ['Artist A'],
    album: 'Album A',
    durationMs: 180000,
    isExplicit: false,
    isLocal: false,
    popularity: 50,
    releaseYear: 2020
  };

  const trackB: TrackCache = {
    id: 'track123', // Same ID
    name: 'Different Name',
    artists: ['Different Artist'],
    album: 'Different Album',
    durationMs: 120000,
    isExplicit: false,
    isLocal: false,
    popularity: 50,
    releaseYear: 2020
  };

  assert.strictEqual(SyncEngine.areTracksEqual(trackA, trackB), true);
});

// 3. Duplicate Detection: Match by Metadata
test('Equal Tracks by Metadata (Within 2s Tolerance)', () => {
  const trackA: TrackCache = {
    id: 'track1',
    name: 'After Hours (Remastered)',
    artists: ['The Weeknd'],
    album: 'After Hours',
    durationMs: 361000, // 6:01.0
    isExplicit: true,
    isLocal: false,
    popularity: 80,
    releaseYear: 2020
  };

  const trackB: TrackCache = {
    id: 'track2', // Different ID
    name: 'After Hours', // Matches normalized title
    artists: ['The Weeknd'], // Matches artist
    album: 'After Hours',
    durationMs: 362500, // 6:02.5 (1.5s difference -> within tolerance)
    isExplicit: true,
    isLocal: false,
    popularity: 80,
    releaseYear: 2020
  };

  assert.strictEqual(SyncEngine.areTracksEqual(trackA, trackB), true);
});

// 4. Duplicate Detection: Mismatch by Duration
test('Mismatch Tracks by Duration Tolerance (>2s Difference)', () => {
  const trackA: TrackCache = {
    id: 'track1',
    name: 'After Hours',
    artists: ['The Weeknd'],
    album: 'After Hours',
    durationMs: 361000, // 6:01.0
    isExplicit: true,
    isLocal: false,
    popularity: 80,
    releaseYear: 2020
  };

  const trackB: TrackCache = {
    id: 'track2',
    name: 'After Hours',
    artists: ['The Weeknd'],
    album: 'After Hours',
    durationMs: 364000, // 6:04.0 (3s difference -> outside tolerance)
    isExplicit: true,
    isLocal: false,
    popularity: 80,
    releaseYear: 2020
  };

  assert.strictEqual(SyncEngine.areTracksEqual(trackA, trackB), false);
});

// 5. Duplicate Detection: Mismatch by Artists
test('Mismatch Tracks by Artists', () => {
  const trackA: TrackCache = {
    id: 'track1',
    name: 'Photograph',
    artists: ['Ed Sheeran'],
    album: 'x',
    durationMs: 258000,
    isExplicit: false,
    isLocal: false,
    popularity: 75,
    releaseYear: 2014
  };

  const trackB: TrackCache = {
    id: 'track2',
    name: 'Photograph',
    artists: ['Nickelback'], // Different artist
    album: 'All the Right Reasons',
    durationMs: 258000,
    isExplicit: false,
    isLocal: false,
    popularity: 70,
    releaseYear: 2005
  };

  assert.strictEqual(SyncEngine.areTracksEqual(trackA, trackB), false);
});

console.log('--------------------------------------------------');
console.log(`Test Execution Finished. Passed: ${passedTests}, Failed: ${failedTests}`);
console.log('--------------------------------------------------');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
