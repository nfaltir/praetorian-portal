CREATE TABLE "announcement" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"category" text,
	"author_id" text NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	CONSTRAINT "announcement_title_length" CHECK (char_length("announcement"."title") BETWEEN 1 AND 120),
	CONSTRAINT "announcement_body_length" CHECK (char_length("announcement"."body") BETWEEN 1 AND 5000),
	CONSTRAINT "announcement_category_valid" CHECK ("announcement"."category" IS NULL OR "announcement"."category" IN ('Announcement', 'Logistics', 'Events', 'Fundraising', 'Volunteers'))
);
--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcement_published_idx" ON "announcement" USING btree ("published_at");