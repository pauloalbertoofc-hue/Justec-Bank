CREATE TABLE users (
 id TEXT PRIMARY KEY, alias TEXT NOT NULL COLLATE NOCASE UNIQUE,
 password_hash TEXT NOT NULL, global_role TEXT NOT NULL DEFAULT 'participant' CHECK(global_role IN ('participant','admin')),
 consent_version TEXT NOT NULL, created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE auth_sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL,
 expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE sessions (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, creator_id TEXT NOT NULL REFERENCES users(id),
 status TEXT NOT NULL CHECK(status IN ('active','archived','closed')), config TEXT NOT NULL CHECK(json_valid(config)),
 config_version INTEGER NOT NULL DEFAULT 1, source_id TEXT REFERENCES sessions(id), created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE memberships (
 session_id TEXT NOT NULL REFERENCES sessions(id), user_id TEXT NOT NULL REFERENCES users(id),
 role TEXT NOT NULL CHECK(role IN ('participant','researcher','admin')), created_at INTEGER NOT NULL,
 PRIMARY KEY(session_id,user_id)
) STRICT;
CREATE TABLE invitations (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), token_hash TEXT NOT NULL UNIQUE,
 role TEXT NOT NULL CHECK(role IN ('participant','researcher','admin')), expires_at INTEGER NOT NULL,
 consumed_by TEXT REFERENCES users(id), created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE accounts (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), owner_id TEXT REFERENCES users(id),
 name TEXT NOT NULL, profile TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('virtual','treasury')),
 status TEXT NOT NULL CHECK(status IN ('active','restricted','closed')), limit_cents INTEGER NOT NULL CHECK(limit_cents>0),
 created_at INTEGER NOT NULL, UNIQUE(id,session_id)
) STRICT;
CREATE TABLE pix_keys (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL, account_id TEXT NOT NULL, value TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1, active INTEGER NOT NULL CHECK(active IN (0,1)), created_at INTEGER NOT NULL,
 FOREIGN KEY(account_id,session_id) REFERENCES accounts(id,session_id), UNIQUE(session_id,value)
) STRICT;
CREATE TABLE scenarios (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), name TEXT NOT NULL,
 baseline TEXT NOT NULL CHECK(json_valid(baseline)), baseline_hash TEXT NOT NULL,
 creator_id TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE ground_truth (
 scenario_id TEXT NOT NULL REFERENCES scenarios(id), operation_id TEXT NOT NULL,
 label TEXT NOT NULL CHECK(label IN ('legitimate','fraudulent')), PRIMARY KEY(scenario_id,operation_id)
) STRICT;
CREATE TABLE runs (
 id TEXT PRIMARY KEY, parent_session_id TEXT NOT NULL REFERENCES sessions(id), session_id TEXT NOT NULL UNIQUE REFERENCES sessions(id),
 scenario_id TEXT NOT NULL REFERENCES scenarios(id), baseline_hash TEXT NOT NULL,
 condition TEXT NOT NULL, config_snapshot TEXT NOT NULL CHECK(json_valid(config_snapshot)), config_hash TEXT NOT NULL, account_map TEXT NOT NULL CHECK(json_valid(account_map)), created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE run_operations (
 id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), operation_id TEXT NOT NULL,
 source_id TEXT NOT NULL REFERENCES accounts(id), destination_id TEXT NOT NULL REFERENCES accounts(id),
 amount_cents INTEGER NOT NULL CHECK(amount_cents>0), scripted_answers TEXT NOT NULL CHECK(json_valid(scripted_answers)),
 UNIQUE(run_id,operation_id)
) STRICT;
CREATE TABLE drafts (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL, actor_id TEXT NOT NULL REFERENCES users(id),
 source_id TEXT NOT NULL, destination_id TEXT NOT NULL,
 key_id TEXT NOT NULL REFERENCES pix_keys(id), key_version INTEGER NOT NULL,
 amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
 status TEXT NOT NULL CHECK(status IN ('review','verification','pause','blocked','completed','cancelled')),
 answers TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(answers)), acknowledgement INTEGER NOT NULL DEFAULT 0 CHECK(acknowledgement IN (0,1)),
 evaluation_id TEXT, request_context INTEGER NOT NULL DEFAULT 0 CHECK(request_context IN (0,1)), config_version INTEGER NOT NULL,
 ready_at INTEGER, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, finished_at INTEGER,
 operation_id TEXT UNIQUE REFERENCES run_operations(id), clearance_id TEXT,
 FOREIGN KEY(source_id,session_id) REFERENCES accounts(id,session_id),
 FOREIGN KEY(destination_id,session_id) REFERENCES accounts(id,session_id)
) STRICT;
CREATE TABLE evaluations (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), draft_id TEXT NOT NULL REFERENCES drafts(id),
 phase TEXT NOT NULL, evidence TEXT NOT NULL CHECK(json_valid(evidence)),
 decision TEXT NOT NULL CHECK(json_valid(decision)), rules_version TEXT NOT NULL, created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE transfers (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), actor_id TEXT NOT NULL REFERENCES users(id),
 source_id TEXT NOT NULL, destination_id TEXT NOT NULL, amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
 kind TEXT NOT NULL CHECK(kind IN ('pix','allocation','adjustment','scenario_history','restoration')),
 status TEXT NOT NULL CHECK(status='completed'), draft_id TEXT UNIQUE REFERENCES drafts(id),
 idempotency_key TEXT NOT NULL, request_hash TEXT NOT NULL, evaluation_id TEXT REFERENCES evaluations(id),
 reason TEXT NOT NULL, created_at INTEGER NOT NULL,
 FOREIGN KEY(source_id,session_id) REFERENCES accounts(id,session_id),
 FOREIGN KEY(destination_id,session_id) REFERENCES accounts(id,session_id),
 UNIQUE(session_id,actor_id,idempotency_key), CHECK(source_id<>destination_id)
) STRICT;
CREATE TABLE ledger_entries (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL, transfer_id TEXT NOT NULL, account_id TEXT NOT NULL,
 delta_cents INTEGER NOT NULL CHECK(delta_cents<>0), created_at INTEGER NOT NULL,
 FOREIGN KEY(account_id,session_id) REFERENCES accounts(id,session_id),
 FOREIGN KEY(transfer_id) REFERENCES transfers(id), UNIQUE(transfer_id,account_id)
) STRICT;
CREATE TRIGGER ledger_session BEFORE INSERT ON ledger_entries
 WHEN NOT EXISTS(SELECT 1 FROM transfers WHERE id=NEW.transfer_id AND session_id=NEW.session_id)
 BEGIN SELECT RAISE(ABORT,'ledger session mismatch'); END;
CREATE TABLE account_observations (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), account_id TEXT NOT NULL REFERENCES accounts(id),
 recipient_id TEXT NOT NULL REFERENCES accounts(id), amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
 provenance TEXT NOT NULL, created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE reviews (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), draft_id TEXT NOT NULL REFERENCES drafts(id),
 requester_id TEXT NOT NULL REFERENCES users(id), reason TEXT NOT NULL, created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE review_decisions (
 id TEXT PRIMARY KEY, review_id TEXT NOT NULL UNIQUE REFERENCES reviews(id), reviewer_id TEXT NOT NULL REFERENCES users(id),
 decision TEXT NOT NULL CHECK(decision IN ('uphold','release')), reason TEXT NOT NULL, created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE observations (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), user_id TEXT NOT NULL REFERENCES users(id),
 run_id TEXT REFERENCES runs(id), note TEXT NOT NULL, created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE snapshots (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), name TEXT NOT NULL,
 payload TEXT NOT NULL CHECK(json_valid(payload)), snapshot_hash TEXT NOT NULL,
 creator_id TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE audit_events (
 id TEXT PRIMARY KEY, session_id TEXT REFERENCES sessions(id), actor_id TEXT REFERENCES users(id),
 action TEXT NOT NULL, entity_id TEXT, payload TEXT NOT NULL CHECK(json_valid(payload)), created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX ledger_account_date ON ledger_entries(account_id,created_at);
CREATE INDEX draft_session_status ON drafts(session_id,status);
CREATE INDEX audit_session_date ON audit_events(session_id,created_at);
CREATE INDEX eval_draft_date ON evaluations(draft_id,created_at);

CREATE UNIQUE INDEX one_followup_per_review ON drafts(clearance_id) WHERE clearance_id IS NOT NULL;
CREATE TABLE attempt_observations (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), source_id TEXT NOT NULL REFERENCES accounts(id),
 destination_id TEXT NOT NULL REFERENCES accounts(id), provenance TEXT NOT NULL, created_at INTEGER NOT NULL
) STRICT;
