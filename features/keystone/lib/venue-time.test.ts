import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holdDay, zonedDateTime } from './venue-time';

test('hold day normalizes to midnight UTC and refuses impossible dates', () => {
  assert.equal(holdDay('2027-03-14'), '2027-03-14T00:00:00.000Z');
  assert.equal(holdDay('2027-03-14T19:30:00-07:00'), '2027-03-14T00:00:00.000Z');
  assert.throws(() => holdDay('2027-02-30'), /Valid date/);
  assert.throws(() => holdDay(''), /Valid date/);
});

test('venue wall clock converts to the right instant across DST', () => {
  assert.equal(zonedDateTime('2027-01-15', '20:00', 'America/Los_Angeles').toISOString(), '2027-01-16T04:00:00.000Z');
  assert.equal(zonedDateTime('2027-07-15', '20:00', 'America/Los_Angeles').toISOString(), '2027-07-16T03:00:00.000Z');
  assert.equal(zonedDateTime('2027-03-14', '19:00', 'America/New_York').toISOString(), '2027-03-14T23:00:00.000Z');
  assert.equal(zonedDateTime('2027-07-15', '20:00', 'UTC').toISOString(), '2027-07-15T20:00:00.000Z');
  assert.throws(() => zonedDateTime('2027-07-15', '25:00', 'UTC'), /HH:MM/);
});
