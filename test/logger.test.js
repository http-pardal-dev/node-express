"use strict";

// Unit tests for the logger (src/logger.js). The logger's behaviour is decided
// by APP_ENV, the way ruby-sinatra swaps the Logger per environment
// (config/environments/*.rb). The suite runs with APP_ENV=test (see
// test/setup.js), which must be silent so the output stays readable — the
// counterpart of `App.set :logging, false` in the test environment.

const logger = require("../src/logger");
const { APP_ENV } = require("../src/config");

describe("logger", () => {
  it("is silent in the test environment", () => {
    expect(APP_ENV).toBe("test");
    expect(logger.level).toBe("silent");
  });

  it("records nothing at info level while silent", () => {
    // With the level at "silent", Pino short-circuits before writing, so these
    // are no-ops. isLevelEnabled is the honest check that the call would write.
    expect(logger.isLevelEnabled("info")).toBe(false);
    expect(logger.isLevelEnabled("error")).toBe(false);
  });

  it("exposes the standard structured-logging levels", () => {
    // A child logger carries a bound field onto every line, the way the app
    // would tag a request or a subsystem.
    const child = logger.child({ subsystem: "test" });
    expect(child.level).toBe("silent");
    expect(typeof child.info).toBe("function");
    expect(typeof child.error).toBe("function");
  });
});
