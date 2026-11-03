const express = require("express");
const roleRoutes = require("./routes/role.routes");
const healthRoutes = require("./routes/health.routes");
const profileRoutes = require("./routes/profile.routes");
const jobRoutes = require("./routes/job.routes");
const analysisRoutes = require("./routes/analysis.routes");
const resumeRoutes = require("./routes/resume.routes");

const app = express();

app.use(express.json());
app.use("/api", roleRoutes);
app.use("/api", healthRoutes);
app.use("/api", profileRoutes);
app.use("/api", jobRoutes);
app.use("/api", analysisRoutes);
app.use("/api", resumeRoutes);

module.exports = app;