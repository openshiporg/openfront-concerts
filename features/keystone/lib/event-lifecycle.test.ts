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
