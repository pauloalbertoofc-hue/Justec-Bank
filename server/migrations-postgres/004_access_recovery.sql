CREATE TABLE recovery_codes (
 user_id TEXT PRIMARY KEY REFERENCES users(id),
 token_hash TEXT NOT NULL UNIQUE,
 expires_at BIGINT NOT NULL,
 created_at BIGINT NOT NULL
);
