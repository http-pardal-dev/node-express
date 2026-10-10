# Node Express HTTP API

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Node](https://img.shields.io/badge/Node-%3E%3D%2020-green.svg)
![Express](https://img.shields.io/badge/Express-5-black.svg)
![SQLite](https://img.shields.io/badge/SQLite-3-003b57.svg)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748.svg)
![CI](https://github.com/http-pardal-dev/node-express/actions/workflows/ci.yml/badge.svg)

An HTTP server built with Node.js and Express, providing a JSON API with three resources. Each resource focuses on a different part of HTTP. It is the Node.js port of [`ruby-sinatra`](../ruby-sinatra), sharing the same API contract (`contract/openapi.yml`).

> **Note:** This API has no authentication. Every route is open and requires no login, token, or permissions. The server listens only on `127.0.0.1`. Do not expose it on `0.0.0.0` or a public address.

## Getting started

Local (Node.js >= 20, see `.node-version`):

```sh
npm install
cp .env.example .env          # optional; development is the default
npm run db:setup              # migrate (dev) + seed
npm start                     # http://127.0.0.1:3000
```

Tests and lint:

```sh
npm test                      # pretest migrates storage/test.sqlite3, then Jest
npm run lint                  # ESLint
```

Docker (same commands as the CI):

```sh
docker compose build
docker compose up dev          # migrate + server
docker compose run --rm test   # migrate + suite
docker compose run --rm lint   # ESLint
```

## Routes

### Health

| Method | Path | What it does |
| --- | --- | --- |
| `GET` | `/` | Health check — `{ service: "node-express", status: "ok" }` |

### Users — CRUD & Fundamentals

| Method | Path | What it does |
| --- | --- | --- |
| `GET` | `/users` | Lists all users |
| `GET` | `/users/:id` | Finds a user by id |
| `POST` | `/users` | Creates a user → `201` + `Location: /users/:id` |
| `PUT` | `/users/:id` | Replaces a user (requires `name`, `email`, `role`) |
| `PATCH` | `/users/:id` | Partially updates a user |
| `DELETE` | `/users/:id` | Removes a user → `204` |

### Products — Queries

| Method | Path | What it does |
| --- | --- | --- |
| `GET` | `/products` | Lists products — filters (`category`, `min_price`, `max_price`), sorting (`sort=name`/`price`, `-` = desc), pagination (`page`, `limit`) |
| `GET` | `/products/:id` | Finds a product by id |
| `POST` | `/products` | Creates a product → `201` + `Location: /products/:id` |
| `PATCH` | `/products/:id` | Partially updates a product |

### Payments — Lifecycle

| Method | Path | What it does |
| --- | --- | --- |
| `POST` | `/payments` | Creates a `pending` payment → `201` + `Location: /payments/:id` |
| `GET` | `/payments` | Lists payments — optional filter `?status=pending|paid|cancelled` |
| `GET` | `/payments/:id` | Finds a payment by id |
| `POST` | `/payments/:id/confirm` | `pending` → `paid` (`409` otherwise) |
| `POST` | `/payments/:id/cancel` | `pending` → `cancelled` (`409` otherwise) |

Details (params, bodies, status codes): see `docs/` and `contract/openapi.yml`.

## Documentation

| Doc | Covers — read this, not the code |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Stack, layout, boot sequence, request lifecycle, database commands |
| [docs/errors.md](docs/errors.md) | Error shapes, status codes, 404/405/500 rules |
| [Users — CRUD & Fundamentals](docs/resources/user-crud.md) | `GET/POST/PUT/PATCH/DELETE /users` — JSON, validation, CRUD |
| [Products — Queries](docs/resources/product-queries.md) | `GET/POST/PATCH /products` — filters, sorting, pagination |
| [Payments — Lifecycle](docs/resources/payment-lifecycle.md) | `POST/GET /payments` + `confirm`/`cancel` — states, idempotency |
| [Continuous integration](docs/ci.md) | Workflows, jobs, Dependabot and running CI locally with act |
| [contract/openapi.yml](contract/openapi.yml) | Machine-readable contract for all routes |

## License

This project is licensed under the [MIT License](LICENSE).
