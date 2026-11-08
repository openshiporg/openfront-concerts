import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { GraphQLError } from 'graphql'
import { CONSTRAINT_MESSAGES, constraintGraphQLError, constraintRefusal } from './constraint-errors'

test('every rule in the migration has a readable message, and no message is orphaned', () => {
  const sql = readFileSync(new URL('../../../migrations/20261108130000_concerts_invariants/migration.sql', import.meta.url), 'utf8')
  const names = [...sql.matchAll(/(?:ADD CONSTRAINT|CREATE (?:UNIQUE INDEX|CONSTRAINT TRIGGER|TRIGGER)) "([^"]+)"/g)].map(m => m[1])
  assert(names.length >= 50)
  for (const name of names) assert(CONSTRAINT_MESSAGES[name], `${name} has no message`)
  for (const name of Object.keys(CONSTRAINT_MESSAGES)) assert(names.includes(name), `${name} is not in the migration`)
})

test('a CHECK refusal is found in Keystone’s debug text and in the cause chain', () => {
  const keystone = new GraphQLError('Prisma error', { extensions: { code: 'KS_PRISMA_ERROR', debug: { message: 'new row for relation "PriceLevel" violates check constraint "PriceLevel_counts_valid"' } } })
  assert.equal(constraintRefusal(keystone)?.code, 'CONCERTS_CAPACITY_EXCEEDED')
  const wrapped = new Error('boom'); (wrapped as any).cause = { message: 'violates check constraint "Payment_currency_code"' }
  assert.equal(constraintRefusal(wrapped)?.code, 'CONCERTS_INVALID_CURRENCY')
})

test('a unique violation is named by index or by its fields', () => {
  assert.equal(constraintRefusal(Object.assign(new Error('x'), { code: 'P2002', meta: { target: ['event', 'position'] } }))?.code, 'CONCERTS_DUPLICATE_BILLING')
  // Offer drafts and bill entries share (event, artist): the field list alone cannot say which refused.
  assert.equal(constraintRefusal(Object.assign(new Error('x'), { code: 'P2002', meta: { target: ['event', 'artist'] } }))?.code, 'CONCERTS_DUPLICATE_RECORD')
  assert.equal(constraintRefusal(new Error('violates "Offer_one_draft_per_event_artist"'))?.code, 'CONCERTS_DUPLICATE_DRAFT')
  assert.equal(constraintRefusal(new Error('Unique constraint failed on the fields: (`ticket`)'))?.code, 'CONCERTS_DUPLICATE_ADMISSION')
  assert.equal(constraintRefusal(new Error('Key (lower(name), lower(city))=(house of blues, dallas) already exists.'))?.code, 'CONCERTS_DUPLICATE_NAME')
})

test('Prisma’s message for a case-insensitive unique index is understood', () => {
  const live = new GraphQLError('Prisma error: Unique constraint failed on the fields: (`lower(name)`,`lower(city)`)', { extensions: { code: 'KS_PRISMA_ERROR' } })
  assert.equal(constraintRefusal(live)?.code, 'CONCERTS_DUPLICATE_NAME')
})

test('unknown errors are left alone and the refusal keeps the path', () => {
  assert.equal(constraintRefusal(new Error('connection reset')), null)
  const out = constraintGraphQLError(new GraphQLError('Prisma error', { path: ['updateEvent'] }), { code: 'CONCERTS_INVALID_TIME_RANGE', message: 'm' })
  assert.deepEqual([out.message, out.extensions.code, out.path], ['m', 'CONCERTS_INVALID_TIME_RANGE', ['updateEvent']])
})
