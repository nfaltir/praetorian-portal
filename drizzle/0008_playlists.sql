CREATE TABLE "playlist" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"provider" text NOT NULL,
	"url" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "playlist_title_length" CHECK (char_length("playlist"."title") BETWEEN 1 AND 80),
	CONSTRAINT "playlist_description_length" CHECK ("playlist"."description" IS NULL OR char_length("playlist"."description") <= 300),
	CONSTRAINT "playlist_provider_valid" CHECK ("playlist"."provider" IN ('spotify', 'youtube', 'youtube_music', 'soundcloud')),
	CONSTRAINT "playlist_url_allowed" CHECK ("playlist"."url" ~ '^https://(open\.spotify\.com|www\.youtube\.com|music\.youtube\.com|soundcloud\.com)/')
);
--> statement-breakpoint
ALTER TABLE "playlist" ADD CONSTRAINT "playlist_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "playlist_created_idx" ON "playlist" USING btree ("created_at");