CREATE TABLE "update_vote" (
	"update_id" text NOT NULL,
	"user_id" text NOT NULL,
	"value" integer NOT NULL,
	"voted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "update_vote_update_id_user_id_pk" PRIMARY KEY("update_id","user_id"),
	CONSTRAINT "update_vote_value_valid" CHECK ("update_vote"."value" IN (1, -1))
);
--> statement-breakpoint
ALTER TABLE "update_vote" ADD CONSTRAINT "update_vote_update_id_announcement_id_fk" FOREIGN KEY ("update_id") REFERENCES "public"."announcement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "update_vote" ADD CONSTRAINT "update_vote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;