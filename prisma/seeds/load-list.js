"use strict";

// Reads a seeds/*.yml file into a list of records, mirroring `load_list` in
// ruby-sinatra/db/seeds.rb. A missing file yields an empty list; a file that is
// not a YAML list is refused, so a malformed fixture fails loudly instead of
// silently seeding nothing.
//
// js-yaml's `load` is the safe entry point (DEFAULT_SCHEMA, no arbitrary
// types), the counterpart of Ruby's YAML.safe_load_file.

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

// Resolves a file name against this folder (prisma/seeds/), so callers pass
// just "users.yml" and the path does not depend on the current directory.
function seedsPath(name) {
  return path.join(__dirname, name);
}

// Loads and validates a seeds file, returning its list of records (plain
// objects). Throws when the file exists but does not hold a YAML list.
function loadList(name) {
  const file = seedsPath(name);
  if (!fs.existsSync(file)) return [];

  const records = yaml.load(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(records)) {
    throw new Error(`Seeds file ${file} must hold a list of records.`);
  }

  return records;
}

module.exports = { seedsPath, loadList };
