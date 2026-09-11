CREATE TYPE "role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "status" AS ENUM('pending', 'graded', 'passed', 'failed');--> statement-breakpoint
CREATE TABLE "assignment_tests" (
	"id" serial PRIMARY KEY UNIQUE,
	"assignment_id" integer NOT NULL,
	"command" varchar(255) NOT NULL,
	"expected_output" varchar(255) NOT NULL,
	"points" integer NOT NULL,
	"timeout" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" serial PRIMARY KEY UNIQUE,
	"classroom_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" varchar(255) NOT NULL,
	"deadline" date NOT NULL,
	"template_repo" varchar(255) NOT NULL,
	"max_score" integer NOT NULL,
	"visibility" "visibility" DEFAULT 'private'::"visibility" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classroom_members" (
	"classroom_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" "role" DEFAULT 'user'::"role" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classrooms" (
	"id" serial PRIMARY KEY UNIQUE,
	"name" varchar(255) NOT NULL,
	"owner_id" integer NOT NULL,
	"github_org" varchar(255) NOT NULL,
	"invite_code" varchar(255) NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY UNIQUE,
	"assignment_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"github_repo" varchar(255) NOT NULL,
	"commit_sha" varchar(255) NOT NULL,
	"status" "status" DEFAULT 'pending'::"status" NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"submitted_at" date DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_results" (
	"submission_id" integer NOT NULL,
	"test_id" integer NOT NULL,
	"status" "status" NOT NULL,
	"stdout" varchar(255) NOT NULL,
	"stderr" varchar(255) NOT NULL,
	"score" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_key";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "role" DEFAULT 'user'::"role" NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "age";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS "users_id_seq";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT nextval('users_id_seq');--> statement-breakpoint
ALTER SEQUENCE "users_id_seq" OWNED BY "public"."users"."id";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE int USING "id"::int;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_id_key" UNIQUE("id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_github_id_key" UNIQUE("github_id");--> statement-breakpoint
ALTER TABLE "assignment_tests" ADD CONSTRAINT "assignment_tests_assignment_id_assignments_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id");--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_classroom_id_classrooms_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id");--> statement-breakpoint
ALTER TABLE "classroom_members" ADD CONSTRAINT "classroom_members_classroom_id_classrooms_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id");--> statement-breakpoint
ALTER TABLE "classroom_members" ADD CONSTRAINT "classroom_members_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignment_id_assignments_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id");--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_users_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_submission_id_submissions_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id");--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_test_id_assignment_tests_id_fkey" FOREIGN KEY ("test_id") REFERENCES "assignment_tests"("id");