CREATE TABLE quiz_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_id UUID NOT NULL,
    course_id TEXT NOT NULL,
    unit_number INTEGER NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    mcq_score INTEGER NOT NULL,
    mcq_total INTEGER NOT NULL,
    frq_score INTEGER NOT NULL,
    frq_total INTEGER NOT NULL,
    total_score INTEGER NOT NULL,
    total_possible INTEGER NOT NULL,
    percentage REAL NOT NULL,
    passed BOOLEAN NOT NULL,
    mcq_results JSONB NOT NULL,
    frq_evaluations JSONB NOT NULL,
    weak_subtopics JSONB NOT NULL DEFAULT '[]',
    overall_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(auth_id, course_id, unit_number, attempt_number)
);
CREATE INDEX idx_quiz_attempts_lookup ON quiz_attempts(auth_id, course_id, unit_number);
