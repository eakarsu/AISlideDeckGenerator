# Completeness review mapping

| Review requirement | Implementation |
|---|---|
| 1 | `deckWorkflow` persists source ingestion, cleared editable assets, queued rendering, review, versioning, publishing, export, correction and deletion. |
| 2 | Rights-versioned assets and render jobs carry provider, idempotency, retry/dead-letter state, receipt, output URI and reconciliation state. |
| 3 | Versioned deck evaluations enforce layout, accessibility, brand and export thresholds and retain multilingual/export details for regression fixtures. |
| 4 | JWT-derived tenant ownership, rights/consent metadata, disclosure receipts, independent editorial approval and append-only audit protect publication. |
| 5 | The generated collaboration/direct AI/gap surfaces are quarantined; canonical versioned workflow transitions are the supported path. |
| 6 | Policy tests, CI, additive migrations, strong secret validation and explicit non-mutating startup/migration commands make delivery repeatable. |
