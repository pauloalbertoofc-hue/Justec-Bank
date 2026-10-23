ALTER TABLE drafts ADD COLUMN revision_of TEXT REFERENCES drafts(id);
CREATE UNIQUE INDEX one_revision_per_draft ON drafts(revision_of)
 WHERE revision_of IS NOT NULL AND clearance_id IS NULL;
CREATE FUNCTION justec_draft_contract() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'immutable draft contract'; END $$;
CREATE TRIGGER immutable_draft_contract BEFORE UPDATE OF
 session_id,actor_id,source_id,destination_id,key_id,key_version,amount_cents,operation_id,clearance_id ON drafts
 FOR EACH ROW EXECUTE FUNCTION justec_draft_contract();
CREATE FUNCTION justec_revision_link() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.revision_of IS NOT NULL OR NEW.revision_of IS NULL THEN
  RAISE EXCEPTION 'immutable revision link';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_revision_link BEFORE UPDATE OF revision_of ON drafts
 FOR EACH ROW EXECUTE FUNCTION justec_revision_link();
