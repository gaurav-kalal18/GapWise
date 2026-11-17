
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { getDatabase, closeDatabase } = require("./connection");

const migrations = [
  {
    version: 1,
    file: "001_initial_schema.sql",
  },
];

const REQUIRED_TABLES = [
  "users",
  "sessions",
  "resume_versions",
  "analysis_reports",
];

function verifySchema(db) {
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table'"
  ).all();

  const actual = new Set(tables.map((row) => row.name));

  const missing = REQUIRED_TABLES.filter(
    (name) => !actual.has(name)
  );

  if (missing.length > 0) {
    throw new Error(
      `Database schema incomplete. Missing tables: ${missing.join(", ")}`
    );
  }
}

function migrateDatabase(db = getDatabase()) {
  const currentVersion = db.pragma("user_version", {
    simple: true,
  });

  const latestVersion = migrations.at(-1).version;

  if (currentVersion > latestVersion) {
    throw new Error(
      `Database version ${currentVersion} is newer than ` +
      `this application's supported version ${latestVersion}.`
    );
  }

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    const sql = fs.readFileSync(
      path.join(__dirname, "migrations", migration.file),
      "utf8"
    );

    const applyMigration = db.transaction(() => {
      db.exec(sql);
      db.pragma(`user_version = ${migration.version}`);
    });

    applyMigration();

    console.log(
      `Applied database migration ${migration.version}`
    );
  }

  // Prevent a false success if the version is correct
  // but one or more required tables are missing.
  verifySchema(db);

  return db.pragma("user_version", { simple: true });
}

if (require.main === module) {
  try {
    const version = migrateDatabase();
    console.log(`GapWise database version: ${version}`);
  } finally {
    closeDatabase();
  }
}

module.exports = {
  migrateDatabase,
  verifySchema,
};
