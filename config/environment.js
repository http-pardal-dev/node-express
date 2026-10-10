"use strict";

// Application environment.
//
// Prepares the runtime (see config/boot.js), then refuses an unknown APP_ENV
// and loads the environment-specific settings, the way config/environment.rb
// does. An unknown environment is refused here, before anything else loads: a
// typo such as `dev` or `testing` would otherwise pick a database that does not
// exist (or worse, the wrong one) and fail much later with a message that does
// not point at the name that is actually wrong.

const { APP_ENV, ENVIRONMENTS } = require("./boot");

if (!ENVIRONMENTS.includes(APP_ENV)) {
  // Printed on its own, without a stack trace: a typo in APP_ENV is a mistake
  // by the person running the server, not a bug in it.
  // eslint-disable-next-line no-console
  console.error(
    `\nAPP_ENV is ${JSON.stringify(APP_ENV)}, but this server only knows: ${ENVIRONMENTS.join(", ")}.\n` +
      "Fix it in the .env file (see .env.example) or set APP_ENV=<name> before starting the server.\n"
  );
  process.exit(1);
}

// Settings specific to the current environment.
require(`./environments/${APP_ENV}`);

// Startup initializers (see config/initializers.js). The database has to be
// ready before the first request, so each initializer is attached here and the
// server stops the boot at the first problem it finds.
require("./initializers");
