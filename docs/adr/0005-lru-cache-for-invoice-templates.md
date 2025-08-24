# ADR 0005: Per-tenant LRU cache for invoice templates

Date: 2025-07-15

## Context

P95 latency spikes on /v2/events due to repeated template fetches.

## Decision

Introduce a per-tenant in-memory LRU (max 100 entries, TTL 5m) in InvoiceService.

## Consequences

- Improves hit-ratio under load
- Adds memory footprint on each instance
- Must evict stale templates on template updates
