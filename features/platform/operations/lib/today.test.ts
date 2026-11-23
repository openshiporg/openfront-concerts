import test from 'node:test';
import assert from 'node:assert/strict';
import { isVenueToday } from './today';

test('door list excludes past and future venue dates', () => {
  const now = new Date('2026-11-23T07:30:00Z'); // Nov 22 in Portland
  assert.equal(isVenueToday('2026-11-20T04:00:00Z', 'America/Los_Angeles', now), false);
  assert.equal(isVenueToday('2026-11-23T04:00:00Z', 'America/Los_Angeles', now), true);
  assert.equal(isVenueToday('2026-11-24T04:00:00Z', 'America/Los_Angeles', now), false);
  assert.equal(isVenueToday(null, 'America/Los_Angeles', now), false);
  assert.equal(isVenueToday('invalid', 'America/Los_Angeles', now), false);
});

test('same instant uses the venue timezone rather than UTC day', () => {
  const now = new Date('2026-11-23T07:30:00Z');
  assert.equal(isVenueToday('2026-11-22T14:00:00Z', 'America/Los_Angeles', now), true);
  assert.equal(isVenueToday('2026-11-22T14:00:00Z', 'Asia/Tokyo', now), false);
});
