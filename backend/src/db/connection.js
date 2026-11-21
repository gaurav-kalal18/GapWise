
"use strict";

const Database = require("better-sqlite3");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

let connection = null;

function getDatabasePath() {
  if (process.env.GAPWISE_DB_PATH) {
    return path.resolve(process.env.GAPWISE_DB_PATH);
  }

  const dataDirectory =
    process.platform === "win32"
      ? path.join(
          process.env.LOCALAPPDATA || os.homedir(),
          "GapWise"
        )
      : path.join(os.homedir(), ".gapwise");

  return path.join(dataDirectory, "gapwise.db");
}

function getDatabase() {
  if (connection && connection.open) {
    return connection;
  }

  const databasePath = getDatabasePath();

  fs.mkdirSync(path.dirname(databasePath), {
    recursive: true,
  });

  const db = new Database(databasePath);

  try {
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
    db.pragma("busy_timeout = 5000");
  } catch (error) {
    db.close();
    throw error;
  }

  connection = db;
  return connection;
}

function closeDatabase() {
  if (connection && connection.open) {
    connection.close();
  }

  connection = null;
}

module.exports = {
  getDatabase,
  getDatabasePath,
  closeDatabase,
};
