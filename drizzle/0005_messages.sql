CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"author_id" text NOT NULL,
	"from_staff" boolean NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_body_length" CHECK (char_length("message"."body") BETWEEN 1 AND 4000)
);
--> statement-breakpoint
CREATE TABLE "message_thread" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"subject" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_author_is_staff" boolean DEFAULT false NOT NULL,
	"member_read_at" timestamp with time zone,
	"staff_read_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	CONSTRAINT "message_thread_subject_length" CHECK (char_length("message_thread"."subject") BETWEEN 1 AND 120)
);
--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_thread_id_message_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."message_thread"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_thread" ADD CONSTRAINT "message_thread_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_thread_idx" ON "message" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "message_thread_member_idx" ON "message_thread" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "message_thread_last_idx" ON "message_thread" USING btree ("last_message_at");