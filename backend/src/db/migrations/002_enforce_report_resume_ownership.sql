
-- GapWise 2.0
-- Enforce consistent ownership between reports and resumes.
--
-- This migration adds triggers only.
-- It does not delete or rewrite historical reports.

-- Reject new reports associated with another user's resume.
CREATE TRIGGER IF NOT EXISTS trg_report_owner_insert
BEFORE INSERT ON analysis_reports
FOR EACH ROW
WHEN NOT EXISTS (
    SELECT 1
    FROM resume_versions AS v
    WHERE v.id = NEW.resume_version_id
      AND v.user_id = NEW.user_id
)
BEGIN
    SELECT RAISE(
        ABORT,
        'Report and resume must have the same owner'
    );
END;

-- Reject report updates that introduce mismatched ownership.
CREATE TRIGGER IF NOT EXISTS trg_report_owner_update
BEFORE UPDATE OF user_id, resume_version_id
ON analysis_reports
FOR EACH ROW
WHEN NOT EXISTS (
    SELECT 1
    FROM resume_versions AS v
    WHERE v.id = NEW.resume_version_id
      AND v.user_id = NEW.user_id
)
BEGIN
    SELECT RAISE(
        ABORT,
        'Report and resume must have the same owner'
    );
END;

-- Prevent moving a resume to a different account while
-- existing reports reference the resume.
CREATE TRIGGER IF NOT EXISTS trg_resume_owner_update
BEFORE UPDATE OF user_id
ON resume_versions
FOR EACH ROW
WHEN EXISTS (
    SELECT 1
    FROM analysis_reports AS r
    WHERE r.resume_version_id = OLD.id
      AND r.user_id <> NEW.user_id
)
BEGIN
    SELECT RAISE(
        ABORT,
        'Cannot change owner of a referenced resume'
    );
END;
