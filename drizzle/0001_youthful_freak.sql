CREATE TABLE "analysis_cache" (
	"word" text PRIMARY KEY NOT NULL,
	"result" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
