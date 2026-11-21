
-- GapWise 2.0: Initial persistent database schema

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user
    ON sessions(user_id);

CREATE INDEX idx_sessions_expires
    ON sessions(expires_at);

CREATE TABLE resume_versions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    label TEXT NOT NULL,
    candidate_snapshot_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_resume_versions_user
    ON resume_versions(user_id, created_at);

CREATE TABLE analysis_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    resume_version_id TEXT NOT NULL,
    target_type TEXT NOT NULL
        CHECK (target_type IN ('role', 'jd')),
    target_key TEXT,
    target_snapshot_json TEXT NOT NULL,
    analysis_snapshot_json TEXT NOT NULL,
    assessment_version TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resume_version_id)
        REFERENCES resume_versions(id) ON DELETE RESTRICT
);

CREATE INDEX idx_reports_user_created
    ON analysis_reports(user_id, created_at);

CREATE INDEX idx_reports_target
    ON analysis_reports(user_id, target_type, target_key);
