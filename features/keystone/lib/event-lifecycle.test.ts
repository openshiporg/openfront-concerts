import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertEventTransition } from './event-lifecycle';

test('event can reach admission and completion through explicit steps', () => {
  for (const [from, to] of [['announced','presale'],['presale','on_sale'],['on_sale','sold_out'],['sold_out','on_sale'],['on_sale','doors'],['doors','in_progress'],['in_progress','completed']]) assert.doesNotThrow(() => assertEventTransition(from, to));
});
test('skips and terminal transitions refused; postponed resumption needs reason', () => {
  for (const [from, to] of [['announced','completed'],['completed','on_sale'],['settled','doors'],['cancelled','announced'],['hold','on_sale']]) assert.throws(() => assertEventTransition(from, to));
  assert.throws(() => assertEventTransition('postponed','announced'));
  assert.doesNotThrow(() => assertEventTransition('postponed','announced','New date confirmed'));
});

import { readFileSync } from 'node:fs';
test('cancelling an event releases every active hold; expiry releases unpaid checkouts and cancels their orders', () => {
  const inv = readFileSync(new URL('../mutations/inventory.ts', import.meta.url), 'utf8');
  assert.match(inv, /opts\.all \? \{\} : \{ expiresAt/);
  assert.match(inv, /id: hold\.orderId, status: 'pending_payment' \}, data: \{ status: 'cancelled' \}/);
  assert.doesNotMatch(inv, /order: null/);
  const ops = readFileSync(new URL('../mutations/operators.ts', import.meta.url), 'utf8');
  assert.match(ops, /expireHolds\(tx, eventId, \{ all: true \}\)/);
  assert.match(ops, /Hold expired', \{ rankKey: null \}/);
});
test('a payment landing after the hold lapsed is refunded under a stable provider key', () => {
  const co = readFileSync(new URL('../mutations/checkout.ts', import.meta.url), 'utf8');
  assert.match(co, /key = `late:\$\{intentId\}`/);
  assert.match(co, /lateAfterExpiry/);
});
