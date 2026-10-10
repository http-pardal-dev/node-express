# Continuous integration

How this project is verified on GitHub, and how to run the same checks
locally. The equivalent of the CI the `ruby-sinatra` workflows provide.

## Workflows

`.github/workflows/ci.yml` runs on every push and pull request to
`main`/`master` (and on demand via `workflow_dispatch`), with `APP_ENV=test`:

| Job | Runner | What it does |
| --- | --- | --- |
| `test` | matrix 20/22/24 × ubuntu/macOS/windows | `npm ci`, migrate the test database (`npm run test:db:migrate`), `npm test` |
| `lint` | ubuntu-latest | `npm ci` + `npm run lint` (Node from `.node-version`) |
| `audit` | ubuntu-latest | `npm audit --omit=dev` — informative only, does not fail the job |

Two more workflows live under `.github/`:

- `workflows/codeql.yml` — CodeQL analysis of the JavaScript code, on pushes
  and pull requests to `main`, weekly (Sundays, midnight UTC) and on demand.
- `dependabot.yml` — weekly PRs for npm dependencies (Mondays 09:00) and for
  GitHub Actions (Mondays 09:30).

The image used by the jobs is defined in the workflow itself; locally,
`Dockerfile` and `docker-compose.yml` provide the same commands (`dev`,
`test`, `lint`, `audit` services).

## Running CI locally with act

[act](https://github.com/nektos/act) executes the same workflow in Docker.
The defaults live in [`.actrc`](../.actrc) (`-W .github/workflows/ci.yml`, the
container image for every matrix label, `--concurrent-jobs 3`, `--rm`):

```sh
act -l                                              # list the jobs
act                                                 # whole CI workflow
act -j lint                                         # only the lint job
act -j audit                                        # only the audit job
act -j test --matrix node-version:22 --matrix os:ubuntu-latest   # one matrix cell
```

Notes:

- Docker Desktop must be running before act starts; a transient DNS failure
  right after the daemon boots usually goes away on a retry.
- act runs everything in Linux containers, so the macOS and Windows runners
  of the matrix cannot be reproduced; `.actrc` maps their labels to the same
  Linux image used for `ubuntu-latest`.
- The `setup-node` cache-save step may print a `::warning::` when the checkout
  path contains a space (e.g. `HTTP Pardal` on Windows); it does not fail the
  job.
- The CodeQL workflow needs the runner tooling of GitHub-hosted runners and is
  not meant to be run with act.

## CI-only commands

| Command | What it does |
| --- | --- |
| `npm run test:db:migrate` | Apply migrations to `storage/test.sqlite3` (what CI runs before the suite) |
| `npm run lint` | ESLint over the project |
| `npm run lint:fix` | ESLint with `--fix` |
