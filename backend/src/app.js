const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health.routes");
const profileRoutes = require("./routes/profile.routes");
const jobRoutes = require("./routes/job.routes");
const analysisRoutes = require("./routes/analysis.routes");
const resumeRoutes = require("./routes/resume.routes");
const roleRoutes = require("./routes/role.routes");
const aiRoutes = require("./routes/ai.routes");

const app = express();

app.use(
    cors({
        origin: "http://localhost:5173",
    })
);

// Bound JSON input independently of individual route validation.
app.use(express.json({limit:'128kb'}));

app.use("/api", healthRoutes);
app.use("/api", profileRoutes);
app.use("/api", jobRoutes);
app.use("/api", analysisRoutes);
app.use("/api", resumeRoutes);
app.use("/api", roleRoutes);
app.use("/api", aiRoutes);

// Last: uniform, non-sensitive responses for malformed bodies and upload failures.
app.use((err,req,res,next) => {
    if (res.headersSent) return next(err);
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({message:'PDF must be 5 MB or smaller.'});
    if (err.code && String(err.code).startsWith('LIMIT_')) return res.status(400).json({message:'Invalid upload: one PDF file is allowed.'});
    if (err.status === 413 || err.type === 'entity.too.large') return res.status(413).json({message:'Request body is too large.'});
    if (err.status === 400 || err.type === 'entity.parse.failed') return res.status(400).json({message:err.type === 'entity.parse.failed' ? 'Malformed JSON request.' : err.message});
    console.error('GapWise request failed:', err.name || 'Error');
    return res.status(500).json({message:'Unable to process request.'});
});

module.exports = app;
