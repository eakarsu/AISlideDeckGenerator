const test=require('node:test');const assert=require('node:assert/strict');const p=require('../domain/deckPolicy');
const asset={asset_ref:'a1',source_ref:'s1',source_version:'v2',checksum:'sha:x',rights_basis:'licensed',captured_at:'2026-07-19'};
test('validates versioned licensed assets',()=>assert.equal(p.validateAsset(asset).rights_basis,'licensed'));
test('rejects unapproved rights basis',()=>assert.throws(()=>p.validateAsset({...asset,rights_basis:'unknown'}),/rights/));
test('blocks inaccessible decks',()=>assert.equal(p.evaluateDeck({layout_fidelity:1,accessibility:.5,brand_compliance:1,export_compatibility:1}).blocked,true));
test('requires versioned assets before render queue',()=>assert.throws(()=>p.validateTransition('editing','render_queued',{assetCount:0}),/assets/));
test('requires independent editorial approval',()=>assert.throws(()=>p.validateTransition('review','approved',{role:'editor',actorId:'u1',createdBy:'u1',evaluationBlocked:false}),/independent/));
test('publishing and deletion require receipts',()=>{assert.throws(()=>p.validateTransition('approved','published',{}),/receipt/);assert.throws(()=>p.validateTransition('draft','deleted',{}),/deletion/);});

