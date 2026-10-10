# Errors

Every response is JSON, errors included. The machine-readable version of this
contract is [`contract/openapi.yml`](../contract/openapi.yml). The shapes are
the same as [`ruby-sinatra`](../../ruby-sinatra/docs/errors.md); the code that
produces them lives in `lib/errors/errors.js` and the helpers.

## Shapes

```json
{ "error": "Short readable reason", "messages": ["detail", "another detail"] }
```

- `error` — always present, one line.
- `messages` — only when a single reason is not enough (validation, bad
  parameters, unknown fields).
- `405` adds `"allow": "GET, HEAD, POST"` **and** the `Allow` header.

Example of a `400`:

```json
{ "error": "Validation failed", "messages": ["Name is too short (minimum is 2 characters)"] }
```

## Status codes

| Code | When | Raised by |
| --- | --- | --- |
| `400` | Malformed `:id`, invalid JSON body, non-object body, unknown field, failed validation, invalid query parameter | `findOr404`, `jsonBody`, `restrictAttributes`, `validateOr400`, `src/helpers/params.js` |
| `404` | Well-formed id with no record, or an unknown path | `findOr404`, `notFoundHandler` |
| `405` | Path exists for another verb (with `Allow` header and body field) | `notFoundHandler` |
| `409` | Uniqueness race lost against the index (Prisma `P2002`), or payment not `pending` anymore | `errorHandler`, confirm/cancel routes |
| `413` | Body over 64 KB (`MAX_BODY_BYTES`) | `src/middleware/raw-body.js` |
| `500` | Unexpected failure; body is always the same generic one | `errorHandler` |

Order matters: the id format is checked **before** the lookup, so a malformed
id is `400` and a missing record is `404` — a broken request and a missing
resource are different things to the client.

## How errors travel

Helpers and routes throw `HttpError(status, body)` (defined in
`lib/errors/errors.js`): an error that already knows its HTTP response.
`errorHandler` (the Express error middleware, mounted last in `src/app.js`)
renders it as-is.

## 404 or 405?

When no route serves the path, `notFoundHandler` decides by matching the
request path against the explicit route table (`ROUTES` in
`lib/errors/errors.js`, `:param` compiled to a wildcard) — the same list the
routers follow:

1. The path matches a route **of another method** → `405` with `Allow`.
2. No method matches → `404`, `{"error": "Resource not found"}`.

`HEAD` is included in the allowed methods whenever `GET` matches, because
Express serves `HEAD` from every `GET` route.

## 500

The body never carries internals: `{"error": "Internal server error"}`. The
exception itself is logged to the shared Pino logger (`Unhandled error`) for
debugging — the counterpart of the original dumping the error in `app.rb`.

One race is turned into a response instead of a bug:

| Exception | Response |
| --- | --- |
| Prisma `P2002` (unique constraint) | `409` `{"error": "Resource already exists"}` |

Unknown fields never reach Prisma: the routes reject them first with `400`
(`restrictAttributes`), the counterpart of the original's
`UnknownAttributeError` handler.

Examples of each response are in [resources/](resources/).
