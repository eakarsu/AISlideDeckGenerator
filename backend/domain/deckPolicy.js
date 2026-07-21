const STAGES = Object.freeze(['draft','sources_ready','editing','render_queued','rendered','review','approved','published','exported','failed','corrected','deleted']);
const acknowledged = (receipt) => Boolean(receipt && receipt.provider && receipt.receipt_id && receipt.status === 'acknowledged' && !Number.isNaN(new Date(receipt.acknowledged_at).valueOf()));

function validateAsset(input) {
  for (const field of ['asset_ref','source_ref','source_version','checksum','rights_basis','captured_at']) if (!input[field]) throw new Error(`${field} is required`);
  const capturedAt = new Date(input.captured_at);
  if (Number.isNaN(capturedAt.valueOf())) throw new Error('captured_at is invalid');
  if (!['owned','licensed','public_domain','consented'].includes(input.rights_basis)) throw new Error('approved rights basis required');
  return { ...input, captured_at: capturedAt.toISOString() };
}

function evaluateDeck(input) {
  const keys = ['layout_fidelity','accessibility','brand_compliance','export_compatibility'];
  const values = keys.map((key) => Number(input[key]));
  if (!values.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) throw new Error('evaluation scores must be 0..1');
  return { score: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4)), blocked: values[1] < 0.9 || values[2] < 0.9 || values[3] < 0.95 };
}

function validateTransition(from, to, context = {}) {
  const allowed = { draft:['sources_ready','deleted'], sources_ready:['editing','deleted'], editing:['render_queued','deleted'], render_queued:['rendered','failed'], rendered:['review','failed'], review:['editing','approved'], approved:['published','exported','corrected'], published:['corrected'], exported:['corrected'], failed:['render_queued','corrected'], corrected:['editing','deleted'], deleted:[] };
  if (!allowed[from]?.includes(to)) throw new Error('invalid deck transition');
  if (to === 'render_queued' && (!context.assetCount || !context.renderProfileVersion)) throw new Error('versioned assets and render profile required');
  if (to === 'approved' && (!['editor','publisher','admin'].includes(context.role) || context.actorId === context.createdBy || context.evaluationBlocked)) throw new Error('independent unblocked editorial approval required');
  if (['published','exported'].includes(to) && (!acknowledged(context.channelReceipt) || !context.disclosureApplied)) throw new Error('acknowledged publishing receipt and disclosure required');
  if (to === 'deleted' && !context.deletionReceipts?.length) throw new Error('deletion receipts required');
  return true;
}

module.exports = { STAGES, validateAsset, evaluateDeck, validateTransition };
