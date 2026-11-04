import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateChartMutation } from './chart-validation';

test('chart create cannot impersonate a published version', async () => {
 const errors:string[]=[];
 await validateChartMutation({resolvedData:{status:'published'},addValidationError:(s:string)=>errors.push(s)},'chart');
 assert.equal(errors.length,1);
});
test('child create and reparent check destination and original chart',async()=>{
 for(const [item,resolvedData] of [[null,{chart:{connect:{id:'published'}}}],[{chartId:'published'},{chart:{connect:{id:'draft'}}}]]){
  const errors:string[]=[];
  await validateChartMutation({item,resolvedData,context:{prisma:{seatingChart:{findUnique:async({where}:any)=>({status:where.id})}}},addValidationError:(s:string)=>errors.push(s)},'section');
  assert.equal(errors.length,1);
 }
});
