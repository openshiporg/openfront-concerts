import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getContext } from '@keystone-6/core/context';
import config from '../index';
import { permissionNames } from '../access';

// A Prisma stand-in: every list returns `rows` items for any count. A filter that reaches the database therefore
// answers `rows`; the probes below must either be refused or never reach the database.
let reached = 0;
const model = new Proxy({}, { get: (_t, op) => async () => { reached++; return op === 'count' ? 3 : op === 'findMany' ? [] : null; } });
class PrismaClient { constructor() { const client: any = new Proxy({}, { get: (_t, k) => k === '$extends' ? () => client : k === '$transaction' ? async (f: any) => f(client) : typeof k === 'symbol' || k === 'then' ? undefined : model }); return client; } }
const PrismaModule = { PrismaClient, Prisma: { DbNull: null, JsonNull: null } };
const base = getContext(config as any, PrismaModule);

const roles: Record<string, string[]> = {
  'Booker': ['canAccessDashboard', 'canManageEvents', 'canManageDeals', 'canManageVenues', 'canManageArtists', 'canManageInventory'],
  'Box Office': ['canAccessDashboard', 'canManageOrders', 'canIssueRefunds', 'canScanTickets'],
  'Door Staff': ['canAccessDashboard', 'canScanTickets'],
  'Settlement Manager': ['canAccessDashboard', 'canManageSettlements', 'canApproveAdjustments', 'canReadAudit', 'canReadPayments'],
};
const as = (name: string) => base.withSession({ itemId: 'u1', listKey: 'User', data: { name, role: { id: 'r', name, ...Object.fromEntries(permissionNames.map(p => [p, roles[name].includes(p)])) } } });

// The auditor's count-filter probes: a readable list counted by a hidden list's money or PII.
const probes: Array<{ query: string; hiddenFrom: string[] }> = [
  { query: '{ eventsCount(where: { settlement_event: { some: { promoterNetCents: { gte: $N } } } }) }', hiddenFrom: ['Booker', 'Box Office', 'Door Staff'] },
  { query: '{ eventsCount(where: { settlement_event: { some: { artistGuaranteeCents: { gte: $N } } } }) }', hiddenFrom: ['Booker', 'Box Office', 'Door Staff'] },
  { query: '{ eventsCount(where: { offer_event: { some: { guaranteeCents: { gte: $N } } } }) }', hiddenFrom: ['Box Office', 'Door Staff'] },
  { query: '{ eventsCount(where: { ticketOrder_event: { some: { totalCents: { gte: $N } } } }) }', hiddenFrom: ['Booker', 'Door Staff', 'Settlement Manager'] },
  { query: '{ eventsCount(where: { ticketOrder_event: { some: { guestEmail: { startsWith: "m$N" } } } }) }', hiddenFrom: ['Booker', 'Door Staff', 'Settlement Manager'] },
  { query: '{ ticketsCount(where: { order: { guestEmail: { startsWith: "m$N" } } }) }', hiddenFrom: ['Door Staff'] },
  { query: '{ ticketsCount(where: { line: { totalCents: { gte: $N } } }) }', hiddenFrom: ['Door Staff'] },
  { query: '{ eventsCount(where: { eventExpense_event: { some: { actualCents: { gte: $N } } } }) }', hiddenFrom: ['Box Office', 'Door Staff'] },
  { query: '{ eventsCount(where: { merchSales_event: { some: { softGrossCents: { gte: $N } } } }) }', hiddenFrom: ['Booker', 'Box Office', 'Door Staff'] },
  { query: '{ eventsCount(where: { promoter: { email: { startsWith: "m$N" } } }) }', hiddenFrom: ['Booker', 'Box Office', 'Door Staff', 'Settlement Manager'] },
  { query: '{ events(orderBy: [{ gross: desc }]) { id } }', hiddenFrom: [] },
];

for (const role of Object.keys(roles)) {
  test(`${role}: count-filter probes on hidden lists are refused for every probe value`, async () => {
    const ctx = as(role);
    for (const probe of probes) {
      if (!probe.hiddenFrom.includes(role)) continue;
      const answers = new Set<string>();
      for (const n of [-1000000, 0, 600000, 1]) {
        reached = 0;
        const res: any = await ctx.graphql.raw({ query: probe.query.replaceAll('$N', String(n)) });
        assert.ok(res.errors?.length, `${role} must not filter ${probe.query}`);
        assert.equal(reached, 0, `${role} probe reached the database: ${probe.query}`);
        answers.add(JSON.stringify(res.data));
      }
      assert.equal(answers.size, 1, `${role} answers differ by probe value for ${probe.query}`);
    }
  });
}

test('a role that can read the related list keeps its filters', async () => {
  const ok = async (role: string, query: string) => { const res: any = await as(role).graphql.raw({ query }); assert.equal(res.errors, undefined, `${role}: ${JSON.stringify(res.errors)}`); };
  await ok('Settlement Manager', '{ eventsCount(where: { settlement_event: { some: { promoterNetCents: { gte: 0 } } } }) }');
  await ok('Booker', '{ eventsCount(where: { offer_event: { some: { guaranteeCents: { gte: 0 } } } }) }');
  await ok('Box Office', '{ ticketsCount(where: { order: { guestEmail: { startsWith: "m" } } }) }');
  await ok('Door Staff', '{ ticketsCount(where: { event: { id: { equals: "x" } }, status: { equals: "valid" } }) }');
});

test('sudo keeps every filter for internal commands', async () => {
  const res: any = await base.sudo().graphql.raw({ query: '{ eventsCount(where: { settlement_event: { some: { promoterNetCents: { gte: 0 } } } }) }' });
  assert.equal(res.errors, undefined);
});
