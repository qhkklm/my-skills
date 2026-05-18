---
name: api-response-contract
description: Standardize API response envelopes, validation-error handling, metadata field hierarchy, and OpenAPI/Swagger output. Use when Codex needs to refactor or define backend interfaces so every endpoint follows one response contract such as code/msg/request_id/data, and runtime output, docs, examples, tests, and framework exception handlers must stay aligned.
---

# API Response Contract

## Define One Envelope

Pick one response envelope and apply it to every success and failure path. Prefer:

```json
{
  "code": 200,
  "msg": "查询成功",
  "request_id": "trace-id",
  "data": {}
}
```

Do not mix envelope styles in the same service. If the project already uses another stable shape, preserve it and align everything else to that shape.

## Cover All Return Paths

Audit these sources of response output before editing:

- Route handlers and service wrappers
- Framework validation exceptions
- Authentication and permission exceptions
- Global exception handlers
- Auto-generated docs examples or response models

If only normal business branches are updated, the API contract is still incomplete.

## Keep Transport, Metadata, and Payload Explicit

Separate HTTP status, tracing metadata, and business payload intentionally:

- Reuse HTTP status in `code` only if the project already does that consistently.
- If the project uses business codes, keep HTTP status and business code distinct.
- Keep `msg` human-readable and stable enough for debugging.
- Keep `request_id` at the top level when it is used for log lookup, tracing, or query replay.
- Keep `data` only for business payload, not tracing metadata.

For failures, keep `data` minimal. Prefer an empty object when there is no business payload.

## Promote Or Demote Fields Deliberately

If a field moves between `data` and the top level, treat it as a contract change rather than a cosmetic refactor.

Typical rule:

- Promote `request_id` to the top level when it is shared metadata across success and failure responses.
- Keep `email`, `captcha`, `received_at`, and similar business fields inside `data`.

After promoting or demoting a field, update all of these together:

- Runtime response builders
- Response schema models
- Validation exception handlers
- Body-assert or snapshot tests
- Generated Swagger/OpenAPI artifacts
- README and example payloads

## Align Models, Docs, and Tests

After changing the envelope, update all related artifacts together:

- Response models or schemas
- Swagger/OpenAPI declarations and generated files
- Tests that assert response bodies
- README or in-repo integration examples

Do not leave Swagger showing framework-native error bodies like `detail` when runtime responses were flattened with custom handlers.

## FastAPI-Specific Rule

For FastAPI projects, route-level return changes do not affect request validation failures. Add or update a global `RequestValidationError` handler so missing or invalid parameters also return the unified envelope.

Typical target shape:

```json
{
  "code": 400,
  "msg": "Field required",
  "request_id": "",
  "data": {}
}
```

If the project requires localized messages, translate them explicitly instead of passing framework defaults through unchanged.

## Execution Checklist

When applying this skill:

1. Identify the current envelope and all exception paths.
2. Decide the final envelope fields and whether `code` mirrors HTTP status.
3. Decide which fields are top-level metadata and which fields remain in `data`.
4. Update route responses and global exception handlers together.
5. Update schema models and Swagger/OpenAPI generation.
6. Update tests for success, business failure, and validation failure.
7. Regenerate offline API docs if the project keeps generated OpenAPI artifacts in the repo.

## Acceptance Standard

The contract is complete only if all of the following are true:

- Successful responses use the target envelope.
- Business failures use the target envelope.
- Framework validation failures use the target envelope.
- Metadata fields such as `request_id` appear at the intended hierarchy in every response path.
- Swagger/OpenAPI matches runtime output.
- Tests cover at least one success case, one business failure, and one validation failure.
