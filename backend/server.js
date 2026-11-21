
"use strict";

const app = require("./src/app");
const { migrateDatabase } = require("./src/db/migrate");

const PORT = Number(process.env.PORT || 5000);

try {
  migrateDatabase();

  app.listen(PORT, () => {
    console.log(`GapWise backend running on port ${PORT}`);
  });
} catch (error) {
  console.error("Backend startup failed:", error.message);
  process.exitCode = 1;
}
