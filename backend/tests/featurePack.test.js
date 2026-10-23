const test=require('node:test'); const assert=require('node:assert/strict');
delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
const logic=require('../domain/featurePackLogic');
test('feature-pack tasks/search/export/ai fallback',()=>{
  logic.resetStore([]);
  const t=logic.createTask({title:'Check presentations alpha',description:'',status:'todo',priority:'high',estimateHours:0,completed:false},'u1');
  assert.equal(t.completed,false); assert.equal(t.estimateHours,0);
  assert.equal(logic.listTasks(logic.getTasks(),{search:'alpha'}).length,1);
  assert.equal(logic.listTasks(logic.getTasks(),{status:'done'}).length,0);
  const u=logic.updateTask(t.id,{status:'done',completed:true}); assert.equal(u.status,'done');
  assert.ok(logic.toCSV(logic.getTasks()).includes('alpha')); assert.equal(logic.toJSONExport(logic.getTasks()).count,1);
  const secs=logic.buildSections(t); assert.ok(secs.find(s=>s.label==='Completed')); assert.ok(secs.find(s=>s.label==='Estimate (hours)'&&s.value==='0'));
  const r0=logic.slideReadability(logic.getTasks()); assert.equal(r0.aiGenerated,false); assert.equal(r0.source,'deterministic-fallback');
  const r1=logic.outlineExpansion(logic.getTasks()); assert.equal(r1.aiGenerated,false); assert.equal(r1.source,'deterministic-fallback');
  const r2=logic.designConsistency(logic.getTasks()); assert.equal(r2.aiGenerated,false); assert.equal(r2.source,'deterministic-fallback');
});
test('feature-pack requires title and no provider key used',()=>{ assert.throws(()=>logic.createTask({}),/title is required/); assert.equal(process.env.OPENAI_API_KEY,undefined); });
