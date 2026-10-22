CREATE TABLE participant_feedback (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id),
 draft_id TEXT NOT NULL REFERENCES drafts(id), user_id TEXT NOT NULL REFERENCES users(id),
 understanding TEXT NOT NULL CHECK(understanding IN ('yes','no','unknown')),
 intention TEXT NOT NULL CHECK(intention IN ('continue','reconsider','unknown')),
 created_at BIGINT NOT NULL, UNIQUE(draft_id,user_id)
);
