CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"is_default" integer DEFAULT false NOT NULL,
	"default_budget" real DEFAULT 0 NOT NULL,
	"no_rollover" integer DEFAULT false NOT NULL,
	"user_id" text DEFAULT '' NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "category_budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"year_month" text NOT NULL,
	"monthly_limit" real DEFAULT 0 NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"user_id" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY DEFAULT 'app_settings' NOT NULL,
	"api_provider" text,
	"api_key" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"user_id" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"user_id" text DEFAULT '' NOT NULL,
	"date" timestamp NOT NULL,
	"description" text NOT NULL,
	"merchant" text NOT NULL,
	"amount" real NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"original_amount" real,
	"original_currency" text,
	"exchange_rate" real,
	"type" text NOT NULL,
	"category" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;