CREATE TABLE "poll" (
	"id" text PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"details" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"show_results" text DEFAULT 'after_vote' NOT NULL,
	CONSTRAINT "poll_question_length" CHECK (char_length("poll"."question") BETWEEN 1 AND 200),
	CONSTRAINT "poll_details_length" CHECK ("poll"."details" IS NULL OR char_length("poll"."details") <= 1000),
	CONSTRAINT "poll_show_results_valid" CHECK ("poll"."show_results" IN ('after_vote', 'after_close'))
);
--> statement-breakpoint
CREATE TABLE "poll_option" (
	"id" text PRIMARY KEY NOT NULL,
	"poll_id" text NOT NULL,
	"label" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "poll_option_id_poll_key" UNIQUE("id","poll_id"),
	CONSTRAINT "poll_option_label_length" CHECK (char_length("poll_option"."label") BETWEEN 1 AND 120)
);
--> statement-breakpoint
CREATE TABLE "poll_vote" (
	"poll_id" text NOT NULL,
	"user_id" text NOT NULL,
	"option_id" text NOT NULL,
	"voted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "poll_vote_poll_id_user_id_pk" PRIMARY KEY("poll_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "poll" ADD CONSTRAINT "poll_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_option" ADD CONSTRAINT "poll_option_poll_id_poll_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."poll"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_vote" ADD CONSTRAINT "poll_vote_poll_id_poll_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."poll"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_vote" ADD CONSTRAINT "poll_vote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_vote" ADD CONSTRAINT "poll_vote_option_in_poll_fk" FOREIGN KEY ("option_id","poll_id") REFERENCES "public"."poll_option"("id","poll_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "poll_closes_idx" ON "poll" USING btree ("closes_at");--> statement-breakpoint
CREATE INDEX "poll_option_poll_idx" ON "poll_option" USING btree ("poll_id","position");--> statement-breakpoint
CREATE INDEX "poll_vote_option_idx" ON "poll_vote" USING btree ("option_id");