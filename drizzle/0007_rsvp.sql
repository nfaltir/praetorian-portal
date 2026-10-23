CREATE TABLE "rsvp" (
	"user_id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"guests" integer DEFAULT 0 NOT NULL,
	"bringing" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	CONSTRAINT "rsvp_status_valid" CHECK ("rsvp"."status" IN ('attending', 'maybe', 'not_attending')),
	CONSTRAINT "rsvp_guests_range" CHECK ("rsvp"."guests" BETWEEN 0 AND 5),
	CONSTRAINT "rsvp_bringing_length" CHECK ("rsvp"."bringing" IS NULL OR char_length("rsvp"."bringing") BETWEEN 1 AND 80),
	CONSTRAINT "rsvp_extras_only_when_attending" CHECK ("rsvp"."status" = 'attending' OR ("rsvp"."guests" = 0 AND "rsvp"."bringing" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "rsvp" ADD CONSTRAINT "rsvp_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp" ADD CONSTRAINT "rsvp_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rsvp_status_idx" ON "rsvp" USING btree ("status");