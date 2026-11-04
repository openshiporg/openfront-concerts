import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogAccessFor } from '../access';

test('venue/talent catalogs require their own permission, not event management', () => {
 for(const permission of ['canManageVenues','canManageArtists'] as const){
  const access=catalogAccessFor(permission).operation;
  assert.equal(access.create({session:undefined}),false);
  assert.equal(access.update({session:{data:{role:{canManageEvents:true}}} as any}),false);
  assert.equal(access.create({session:{data:{role:{[permission]:true}}} as any}),true);
  assert.equal(access.update({session:{data:{role:{[permission]:true}}} as any}),true);
  assert.equal(access.delete(),false);
 }
});
