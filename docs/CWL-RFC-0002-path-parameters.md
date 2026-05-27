# CWL RFC 0002 — Path parameters (draft)

**Status:** draft (not yet implemented)  
**Planned:** G79

## Summary

Promote `:id` path templates from Express, Flask, Gin, and Spring into CWL route paths with typed `pathParams` in WebIR.

## Evidence target

- Cross-language synthesis: all framework stacks declare path templates on routes.
- Gold suites: extend **`hub-gold-*-literal`** fixtures with parameterized routes once ingest records `pathParams`.

## Non-goals

- Full regex routes or optional segments in v1 of this RFC.
