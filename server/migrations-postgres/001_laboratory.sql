CREATE FUNCTION justec_json_valid(value TEXT) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
 PERFORM value::json;
 RETURN TRUE;
EXCEPTION WHEN invalid_text_representation THEN RETURN FALSE;
END $$;
CREATE TABLE users (
 id TEXT PRIMARY KEY, alias TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, global_role TEXT NOT NULL DEFAULT 'participant' CHECK(global_role IN ('participant','admin')),
 consent_version TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE TABLE auth_sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL,
 expires_at BIGINT NOT NULL, created_at BIGINT NOT NULL
);
CREATE TABLE sessions (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, creator_id TEXT NOT NULL REFERENCES users(id),
 status TEXT NOT NULL CHECK(status IN ('active','archived','closed')), config TEXT NOT NULL CHECK(justec_json_valid(config)),
 config_version BIGINT NOT NULL DEFAULT 1, source_id TEXT REFERENCES sessions(id), created_at BIGINT NOT NULL
);
CREATE TABLE memberships (
 session_id TEXT NOT NULL REFERENCES sessions(id), user_id TEXT NOT NULL REFERENCES users(id),
 role TEXT NOT NULL CHECK(role IN ('participant','researcher','admin')), created_at BIGINT NOT NULL,
 PRIMARY KEY(session_id,user_id)
);
CREATE TABLE invitations (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), token_hash TEXT NOT NULL UNIQUE,
 role TEXT NOT NULL CHECK(role IN ('participant','researcher','admin')), expires_at BIGINT NOT NULL,
 consumed_by TEXT REFERENCES users(id), created_at BIGINT NOT NULL
);
CREATE TABLE accounts (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), owner_id TEXT REFERENCES users(id),
 name TEXT NOT NULL, profile TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('virtual','treasury')),
 status TEXT NOT NULL CHECK(status IN ('active','restricted','closed')), limit_cents BIGINT NOT NULL CHECK(limit_cents>0),
 created_at BIGINT NOT NULL, UNIQUE(id,session_id)
);
CREATE TABLE pix_keys (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL, account_id TEXT NOT NULL, value TEXT NOT NULL,
 version BIGINT NOT NULL DEFAULT 1, active BIGINT NOT NULL CHECK(active IN (0,1)), created_at BIGINT NOT NULL,
 FOREIGN KEY(account_id,session_id) REFERENCES accounts(id,session_id), UNIQUE(session_id,value)
);
CREATE TABLE scenarios (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), name TEXT NOT NULL,
 baseline TEXT NOT NULL CHECK(justec_json_valid(baseline)), baseline_hash TEXT NOT NULL,
 creator_id TEXT NOT NULL REFERENCES users(id), created_at BIGINT NOT NULL
);
CREATE TABLE ground_truth (
 scenario_id TEXT NOT NULL REFERENCES scenarios(id), operation_id TEXT NOT NULL,
 label TEXT NOT NULL CHECK(label IN ('legitimate','fraudulent')), PRIMARY KEY(scenario_id,operation_id)
);
CREATE TABLE runs (
 id TEXT PRIMARY KEY, parent_session_id TEXT NOT NULL REFERENCES sessions(id), session_id TEXT NOT NULL UNIQUE REFERENCES sessions(id),
 scenario_id TEXT NOT NULL REFERENCES scenarios(id), baseline_hash TEXT NOT NULL,
 condition TEXT NOT NULL, config_snapshot TEXT NOT NULL CHECK(justec_json_valid(config_snapshot)), config_hash TEXT NOT NULL, account_map TEXT NOT NULL CHECK(justec_json_valid(account_map)), created_at BIGINT NOT NULL
);
CREATE TABLE run_operations (
 id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), operation_id TEXT NOT NULL,
 source_id TEXT NOT NULL REFERENCES accounts(id), destination_id TEXT NOT NULL REFERENCES accounts(id),
 amount_cents BIGINT NOT NULL CHECK(amount_cents>0), scripted_answers TEXT NOT NULL CHECK(justec_json_valid(scripted_answers)),
 UNIQUE(run_id,operation_id)
);
CREATE TABLE drafts (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL, actor_id TEXT NOT NULL REFERENCES users(id),
 source_id TEXT NOT NULL, destination_id TEXT NOT NULL,
 key_id TEXT NOT NULL REFERENCES pix_keys(id), key_version BIGINT NOT NULL,
 amount_cents BIGINT NOT NULL CHECK(amount_cents>0),
 status TEXT NOT NULL CHECK(status IN ('review','verification','pause','blocked','completed','cancelled')),
 answers TEXT NOT NULL DEFAULT '{}' CHECK(justec_json_valid(answers)), acknowledgement BIGINT NOT NULL DEFAULT 0 CHECK(acknowledgement IN (0,1)),
 evaluation_id TEXT, request_context BIGINT NOT NULL DEFAULT 0 CHECK(request_context IN (0,1)), config_version BIGINT NOT NULL,
 ready_at BIGINT, expires_at BIGINT NOT NULL, created_at BIGINT NOT NULL, finished_at BIGINT,
 operation_id TEXT UNIQUE REFERENCES run_operations(id), clearance_id TEXT,
 FOREIGN KEY(source_id,session_id) REFERENCES accounts(id,session_id),
 FOREIGN KEY(destination_id,session_id) REFERENCES accounts(id,session_id)
);
CREATE TABLE evaluations (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), draft_id TEXT NOT NULL REFERENCES drafts(id),
 phase TEXT NOT NULL, evidence TEXT NOT NULL CHECK(justec_json_valid(evidence)),
 decision TEXT NOT NULL CHECK(justec_json_valid(decision)), rules_version TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE TABLE transfers (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), actor_id TEXT NOT NULL REFERENCES users(id),
 source_id TEXT NOT NULL, destination_id TEXT NOT NULL, amount_cents BIGINT NOT NULL CHECK(amount_cents>0),
 kind TEXT NOT NULL CHECK(kind IN ('pix','allocation','adjustment','scenario_history','restoration')),
 status TEXT NOT NULL CHECK(status='completed'), draft_id TEXT UNIQUE REFERENCES drafts(id),
 idempotency_key TEXT NOT NULL, request_hash TEXT NOT NULL, evaluation_id TEXT REFERENCES evaluations(id),
 reason TEXT NOT NULL, created_at BIGINT NOT NULL,
 FOREIGN KEY(source_id,session_id) REFERENCES accounts(id,session_id),
 FOREIGN KEY(destination_id,session_id) REFERENCES accounts(id,session_id),
 UNIQUE(session_id,actor_id,idempotency_key), CHECK(source_id<>destination_id)
);
CREATE TABLE ledger_entries (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL, transfer_id TEXT NOT NULL, account_id TEXT NOT NULL,
 delta_cents BIGINT NOT NULL CHECK(delta_cents<>0), created_at BIGINT NOT NULL,
 FOREIGN KEY(account_id,session_id) REFERENCES accounts(id,session_id),
 entry_order BIGINT GENERATED ALWAYS AS IDENTITY,
 FOREIGN KEY(transfer_id) REFERENCES transfers(id), UNIQUE(transfer_id,account_id)
);

CREATE TABLE account_observations (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), account_id TEXT NOT NULL REFERENCES accounts(id),
 recipient_id TEXT NOT NULL REFERENCES accounts(id), amount_cents BIGINT NOT NULL CHECK(amount_cents>0),
 provenance TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE TABLE reviews (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), draft_id TEXT NOT NULL REFERENCES drafts(id),
 requester_id TEXT NOT NULL REFERENCES users(id), reason TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE TABLE review_decisions (
 id TEXT PRIMARY KEY, review_id TEXT NOT NULL UNIQUE REFERENCES reviews(id), reviewer_id TEXT NOT NULL REFERENCES users(id),
 decision TEXT NOT NULL CHECK(decision IN ('uphold','release')), reason TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE TABLE observations (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), user_id TEXT NOT NULL REFERENCES users(id),
 run_id TEXT REFERENCES runs(id), note TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE TABLE snapshots (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), name TEXT NOT NULL,
 payload TEXT NOT NULL CHECK(justec_json_valid(payload)), snapshot_hash TEXT NOT NULL,
 creator_id TEXT NOT NULL REFERENCES users(id), created_at BIGINT NOT NULL
);
CREATE TABLE audit_events (
 id TEXT PRIMARY KEY, session_id TEXT REFERENCES sessions(id), actor_id TEXT REFERENCES users(id),
 action TEXT NOT NULL, entity_id TEXT, payload TEXT NOT NULL CHECK(justec_json_valid(payload)), created_at BIGINT NOT NULL
);
CREATE INDEX ledger_account_date ON ledger_entries(account_id,created_at);
CREATE INDEX draft_session_status ON drafts(session_id,status);
CREATE INDEX audit_session_date ON audit_events(session_id,created_at);
CREATE INDEX eval_draft_date ON evaluations(draft_id,created_at);

CREATE UNIQUE INDEX one_followup_per_review ON drafts(clearance_id) WHERE clearance_id IS NOT NULL;
CREATE TABLE attempt_observations (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), source_id TEXT NOT NULL REFERENCES accounts(id),
 destination_id TEXT NOT NULL REFERENCES accounts(id), provenance TEXT NOT NULL, created_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX users_alias_lower ON users(lower(alias));
CREATE FUNCTION justec_ledger_session() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM transfers WHERE id=NEW.transfer_id AND session_id=NEW.session_id) THEN
  RAISE EXCEPTION 'ledger session mismatch';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ledger_session BEFORE INSERT ON ledger_entries FOR EACH ROW EXECUTE FUNCTION justec_ledger_session();
