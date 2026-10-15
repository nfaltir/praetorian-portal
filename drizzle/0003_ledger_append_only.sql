-- Contributions are append-only: no UPDATE, DELETE or TRUNCATE, from the
-- app, a bug, or the Neon console. Corrections are reversal rows.
CREATE OR REPLACE FUNCTION contribution_block_changes() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'contribution is append-only (% blocked); record a reversal instead', TG_OP;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER contribution_no_update_delete
  BEFORE UPDATE OR DELETE ON contribution
  FOR EACH ROW EXECUTE FUNCTION contribution_block_changes();
--> statement-breakpoint
CREATE TRIGGER contribution_no_truncate
  BEFORE TRUNCATE ON contribution
  FOR EACH STATEMENT EXECUTE FUNCTION contribution_block_changes();
--> statement-breakpoint
-- A reversal must exactly cancel a payment: same member, same amount,
-- and it can only target a payment (never another reversal).
CREATE OR REPLACE FUNCTION contribution_check_reversal() RETURNS trigger AS $$
DECLARE
  original contribution%ROWTYPE;
BEGIN
  IF NEW.kind <> 'reversal' THEN
    RETURN NEW;
  END IF;
  SELECT * INTO original FROM contribution WHERE id = NEW.reverses_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'reversal target % does not exist', NEW.reverses_id;
  END IF;
  IF original.kind <> 'payment' THEN
    RAISE EXCEPTION 'only payments can be reversed';
  END IF;
  IF original.member_id <> NEW.member_id OR original.amount_cents <> NEW.amount_cents THEN
    RAISE EXCEPTION 'reversal must match the original member and amount';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER contribution_reversal_matches
  BEFORE INSERT ON contribution
  FOR EACH ROW EXECUTE FUNCTION contribution_check_reversal();