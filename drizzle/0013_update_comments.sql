CREATE TABLE "update_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"update_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"removed_by" text,
	CONSTRAINT "update_comment_body_valid" CHECK (("update_comment"."removed_at" IS NULL AND char_length("update_comment"."body") BETWEEN 1 AND 1000) OR ("update_comment"."removed_at" IS NOT NULL AND "update_comment"."body" = ''))
);
--> statement-breakpoint
ALTER TABLE "update_comment" ADD CONSTRAINT "update_comment_update_id_announcement_id_fk" FOREIGN KEY ("update_id") REFERENCES "public"."announcement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "update_comment" ADD CONSTRAINT "update_comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "update_comment" ADD CONSTRAINT "update_comment_removed_by_user_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "update_comment_update_idx" ON "update_comment" USING btree ("update_id","created_at");