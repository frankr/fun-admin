# Production Readiness Checklist (Mobile + Admin)

_Last updated: February 25, 2026_

## Executive status
Current state is **development-ready** for data modeling and import, but **not production-ready** yet.

What is complete:
- Postgres schema is implemented and tested locally.
- Houston CSV import pipeline works with upsert, warnings, and issue tracking.
- Five ranked image slots are auto-created per activity.

What blocks production go-live:
- No production API layer for mobile/admin traffic yet.
- No production hosting/deployment for Postgres and backend.
- No auth/authorization policy implementation.
- No monitoring/alerting/backup runbooks configured.

## 1. Data model and quality
- [x] Activities schema and joins (locations, age groups, activity types).
- [x] City support in data model.
- [x] Image metadata model with fixed rank 1-5.
- [x] Import warnings table and review queue.
- [x] Audit/version history table.
- [ ] Data quality SLAs defined (acceptable warning/error thresholds).
- [ ] Admin workflow to resolve data issues in UI.

## 2. Import pipeline and operations
- [x] Idempotent CSV upsert by `external_id`.
- [x] Dry-run mode before commit.
- [x] Batch-level audit and row-level outcomes.
- [ ] Scheduled imports (or explicit operator runbook cadence).
- [ ] Alerting when imports fail or warning volume spikes.
- [ ] Retry/recovery runbook for failed imports.

## 3. Backend/API serving mobile clients
- [ ] Production backend service exists (REST/GraphQL).
- [ ] Read endpoints for mobile feed are implemented.
- [ ] Admin CRUD endpoints are implemented.
- [ ] Pagination and strict response shaping are implemented.
- [ ] Rate limiting and request validation enabled.
- [ ] API versioning strategy documented.

## 4. Performance and scalability
- [ ] Production Postgres sizing selected (vCPU/RAM/storage).
- [ ] Required indexes validated with real feed queries.
- [ ] Query plans tested (`EXPLAIN ANALYZE`) for hot paths.
- [ ] Cache strategy added for high-traffic reads (Redis/CDN).
- [ ] p95/p99 latency SLOs defined and measured.

## 5. Security and compliance
- [ ] Authentication in place for admin users.
- [ ] Role-based authorization for admin actions.
- [ ] Secrets managed securely (no plaintext in repo).
- [ ] TLS enforced for API and DB connections.
- [ ] Audit log access policy documented.

## 6. Reliability, backup, and disaster recovery
- [ ] Automated daily backups configured.
- [ ] Point-in-time recovery capability enabled.
- [ ] Restore drill tested and documented.
- [ ] Incident runbook for DB/API outage created.
- [ ] Defined RPO/RTO targets.

## 7. Deployment and release process
- [ ] Staging and production environments configured.
- [ ] Migration pipeline for schema changes in CI/CD.
- [ ] Health checks and smoke tests on deploy.
- [ ] Rollback procedure documented and tested.

## 8. Observability
- [ ] Centralized logs (API + DB + import jobs).
- [ ] Metrics dashboards (traffic, errors, latency, DB load).
- [ ] Alerts configured (error rate, DB saturation, failed imports).
- [ ] Slow query monitoring enabled.

## 9. Suggested rollout path
1. Build backend API around current Postgres schema.
2. Deploy staging stack (managed Postgres + backend + object storage).
3. Run Houston import in staging and validate mobile feed performance.
4. Implement monitoring, backups, and incident runbooks.
5. Run controlled production launch for Houston.
6. Expand to next cities using same import workflow.

## 10. Immediate next actions (high impact)
1. Implement read-only mobile feed endpoints first (city, age group, activity type filters).
2. Add indexes for those exact query patterns and benchmark.
3. Ship admin issue-review UI for `activity_data_issues`.
4. Stand up staging environment and run an end-to-end test with real app clients.
