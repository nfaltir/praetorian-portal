CREATE TABLE "trivia_card" (
	"id" text PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "trivia_question_length" CHECK (char_length("trivia_card"."question") BETWEEN 1 AND 280),
	CONSTRAINT "trivia_answer_length" CHECK (char_length("trivia_card"."answer") BETWEEN 1 AND 160)
);
--> statement-breakpoint
ALTER TABLE "trivia_card" ADD CONSTRAINT "trivia_card_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trivia_card_active_idx" ON "trivia_card" USING btree ("active");