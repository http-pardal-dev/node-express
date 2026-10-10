"use strict";

// ESLint flat configuration for the node-express server.
//
// The counterpart of ruby-sinatra's .rubocop.yml: one ruled style for the whole
// project, checked by `npm run lint` and by the lint job of the CI. The rules
// stay close to how the code is already written (CommonJS, "use strict" on top,
// double quotes, semicolons) instead of inventing a new style: the linter pins
// the conventions down, it does not redesign them.
//
//   npm run lint        # check (what the CI runs)
//   npm run lint:fix    # check and fix what can be fixed automatically
//
// test/ and db/seeds/ relax no-console: the seed script reports its result on
// stdout and the shared test helpers dump responses for debugging.

const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
        console: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly",
      },
    },
    rules: {
      // The codebase style: double quotes and semicolons. Single-line guard
      // clauses without braces are the established style (helpers, routes,
      // models), so the linter pins consistency, not a new brace style.
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],
      // No unused variables or unreachable code in the suite's way.
      "no-unused-vars": ["error", { args: "none" }],
      "no-unreachable": "error",
      // console is the logger of scripts (seeds) and of boot failures; the
      // request path uses Pino instead (see config/initializers/logger.js).
      "no-console": "error",
    },
  },
  {
    files: ["db/seeds/**/*.js", "src/server.js"],
    rules: {
      // The seed script prints its result, and the boot prints why it stops
      // and the listen line: both address the person running the command,
      // not the request log.
      "no-console": "off",
    },
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      globals: {
        afterAll: "readonly",
        beforeEach: "readonly",
        describe: "readonly",
        expect: "readonly",
        it: "readonly",
        jest: "readonly",
      },
    },
    rules: {
      // Shared helpers dump responses while debugging failing specs.
      "no-console": "off",
    },
  },
  {
    // Generated Prisma Client and the coverage report are never linted.
    ignores: ["node_modules/", "coverage/"],
  },
];
