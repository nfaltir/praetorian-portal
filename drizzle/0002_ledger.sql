CREATE TABLE "contribution" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"kind" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"paid_on" date NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by" text NOT NULL,
	"reverses_id" text,
	"memo" text,
	CONSTRAINT "contribution_amount_range" CHECK ("contribution"."amount_cents" > 0 AND "contribution"."amount_cents" <= 10000000),
	CONSTRAINT "contribution_reversal_link" CHECK (("contribution"."kind" = 'reversal') = ("contribution"."reverses_id" IS NOT NULL)),
	CONSTRAINT "contribution_memo_length" CHECK ("contribution"."memo" IS NULL OR char_length("contribution"."memo") <= 200)
);
--> statement-breakpoint
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_reverses_id_contribution_id_fk" FOREIGN KEY ("reverses_id") REFERENCES "public"."contribution"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contribution_reverses_once_idx" ON "contribution" USING btree ("reverses_id");--> statement-breakpoint
CREATE INDEX "contribution_member_idx" ON "contribution" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "contribution_recorded_at_idx" ON "contribution" USING btree ("recorded_at");