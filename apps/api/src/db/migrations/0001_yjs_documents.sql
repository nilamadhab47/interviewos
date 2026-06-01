CREATE TABLE IF NOT EXISTS "yjs_documents" (
	"session_id" uuid PRIMARY KEY NOT NULL,
	"state" bytea NOT NULL,
	"language" varchar(30) DEFAULT 'javascript' NOT NULL,
	"initialized" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "yjs_documents" ADD CONSTRAINT "yjs_documents_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
