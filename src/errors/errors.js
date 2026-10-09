"use strict";

// Application error handling, mirroring lib/errors/errors.rb.
//
// Every response is JSON, errors included. The application answers bad input
// with 4xx before Prisma is involved (see helpers/), so reaching the 500 path
// here means a bug. Two races are still turned into responses: a uniqueness
// conflict lost between the check and the insert answers 409, and an unknown
// attribute answers 400.

// An error that already knows its HTTP status and JSON body. Thrown by the
// helpers and routes; rendered by errorHandler below.
class HttpError extends Error {
  constructor(status, body) {
    super(body && body.error ? body.error : "Error");
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

// The application's routes as [METHOD, path] pairs, with ":param" placeholders.
// The 405 answer matches the request path against them, the same way Express
// dispatches a route. Kept as an explicit table (like ruby-sinatra's
// snapshot_routes!) instead of reading framework internals, which differ across
// Express versions; ROUTES below is the single source of truth the routers and
// this handler both follow.
const ROUTES = [
  ["GET", "/"],
  ["GET", "/users"],
  ["POST", "/users"],
  ["GET", "/users/:id"],
  ["PUT", "/users/:id"],
  ["PATCH", "/users/:id"],
  ["DELETE", "/users/:id"],
  ["GET", "/products"],
  ["POST", "/products"],
  ["GET", "/products/:id"],
  ["PATCH", "/products/:id"],
  ["GET", "/payments"],
  ["POST", "/payments"],
  ["GET", "/payments/:id"],
  ["POST", "/payments/:id/confirm"],
  ["POST", "/payments/:id/cancel"],
];

// Compiles a route path ("/users/:id") into an anchored RegExp. ":param"
// becomes "[^/]+"; every other character is matched literally.
function compile(pattern) {
  const source = pattern
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) return "([^/]+)";
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");

  return new RegExp(`^${source}$`);
}

const MATCHERS = ROUTES.map(([method, path]) => ({ method, regexp: compile(path) }));

// HTTP methods whose routes match `path`, for the 405 answer. HEAD is served by
// Express from every GET route, so a path with GET also allows HEAD.
function methodsFor(path) {
  const normalized = path.length === 0 ? "/" : path;
  const methods = MATCHERS.filter(({ method, regexp }) => method !== "HEAD" && regexp.test(normalized)).map(
    ({ method }) => method
  );

  if (methods.includes("GET")) methods.push("HEAD");

  return [...new Set(methods)].sort();
}

// The 404/405 answer for a path no route of this method served.
//
//   - the path matches a route of another method -> 405 with an Allow header;
//   - otherwise the address itself does not exist -> 404.
function notFoundHandler(req, res) {
  const allowed = methodsFor(req.path);

  if (allowed.length > 0) {
    const allow = allowed.join(", ");
    res.set("Allow", allow);
    return res.status(405).json({ error: "Method not allowed", allow });
  }

  return res.status(404).json({ error: "Resource not found" });
}

// Unexpected errors and races. The exception decides the response: a lost
// uniqueness race is a 409, anything thrown as an HttpError keeps its status
// and body, and anything else stays a generic 500 so internals never leak.
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    return res.status(err.status).json(err.body);
  }

  // A uniqueness race that reaches the database (Prisma P2002 on a unique key).
  if (err && err.code === "P2002") {
    return res.status(409).json({ error: "Resource already exists" });
  }

  // The exception itself is logged to the error stream for debugging; the
  // client only gets the generic message.
  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}

module.exports = {
  HttpError,
  ROUTES,
  methodsFor,
  notFoundHandler,
  errorHandler,
};

