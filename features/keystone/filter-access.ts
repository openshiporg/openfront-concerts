/**
 * Filter and order follow read. Keystone resolves a nested `where` on a relationship without asking the related
 * list's access, so a role that cannot read Settlement could still count Events by `settlement_event.promoterNetCents`.
 * Every field here is filterable and orderable only when the role can query its own list and read the field, and a
 * relationship field additionally needs the related list to be fully readable (no row filter). `context.sudo()`
 * replaces these with `true`, so internal commands are unaffected.
 */
type Args = { session?: unknown; context?: unknown; listKey?: string; fieldKey?: string };
type Gate = (args: any) => unknown;
type ListConfig = { access?: any; fields: Record<string, any> };

const operationGate = (access: any): Gate | undefined => typeof access === 'function' ? access : access?.operation && typeof access.operation === 'function' ? access.operation : access?.operation?.query;
const fieldReadGate = (access: any): Gate | undefined => typeof access === 'function' ? access : access?.read;

async function passes(gate: Gate | undefined, args: Args, extra: Record<string, unknown> = {}) {
  if (typeof gate !== 'function') return true;
  try { return (await gate({ ...args, operation: 'query', ...extra })) === true; } catch { return false; }
}

/** Can this session read every row of `list`? Row filters (e.g. "only yourself") count as no. */
export async function canReadWholeList(list: ListConfig | undefined, args: Args) {
  if (!list) return false;
  if (!(await passes(operationGate(list.access), args))) return false;
  const rowFilter = list.access?.filter?.query;
  if (typeof rowFilter !== 'function') return true;
  try { return (await rowFilter({ ...args, operation: 'query' })) === true; } catch { return false; }
}

export function filterFollowsRead<T extends Record<string, ListConfig>>(lists: T): T {
  return Object.fromEntries(Object.entries(lists).map(([listKey, list]) => [listKey, {
    ...list,
    fields: Object.fromEntries(Object.entries(list.fields).map(([fieldKey, field]) => {
      if (typeof field !== 'function' || fieldKey.startsWith('__group')) return [fieldKey, field];
      return [fieldKey, (data: any) => {
        const f = field(data);
        const target = f?.dbField?.kind === 'relation' ? f.dbField.list as string : null;
        const own = f.isFilterable; const ownOrder = f.isOrderable;
        const allowed = async (args: Args) => {
          if (!(await passes(operationGate(list.access), args))) return false;
          if (!(await passes(fieldReadGate(f.access), args, { listKey, fieldKey, item: undefined }))) return false;
          if (target && !(await canReadWholeList(lists[target], args))) return false;
          return true;
        };
        // A field already closed to filtering stays out of the where input entirely.
        const combine = (base: unknown) => base === false ? false : async (args: Args) => {
          if (typeof base === 'function' && (await base(args)) !== true) return false;
          return allowed(args);
        };
        return { ...f, isFilterable: combine(own), isOrderable: combine(ownOrder) };
      }];
    })),
  }])) as T;
}
