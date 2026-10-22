ALTER TABLE drafts ADD COLUMN revision_of TEXT REFERENCES drafts(id);
CREATE UNIQUE INDEX one_revision_per_draft ON drafts(revision_of)
 WHERE revision_of IS NOT NULL AND clearance_id IS NULL;
CREATE TRIGGER immutable_draft_contract BEFORE UPDATE OF
 session_id,actor_id,source_id,destination_id,key_id,key_version,amount_cents,operation_id,clearance_id ON drafts
 BEGIN SELECT RAISE(ABORT,'immutable draft contract'); END;
CREATE TRIGGER immutable_revision_link BEFORE UPDATE OF revision_of ON drafts
 WHEN OLD.revision_of IS NOT NULL OR NEW.revision_of IS NULL
 BEGIN SELECT RAISE(ABORT,'immutable revision link'); END;
