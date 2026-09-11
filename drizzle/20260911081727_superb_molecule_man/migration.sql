CREATE TYPE "role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "submission_status" AS ENUM('pending', 'provisioning', 'ready', 'graded', 'failed');--> statement-breakpoint
CREATE TYPE "test_result_status" AS ENUM('passed', 'failed');--> statement-breakpoint
CREATE TYPE "visibility" AS ENUM('public', 'private');--> statement-breakpoint
ALTER TABLE "assignment_tests" DROP CONSTRAINT "assignment_tests_id_key";--> statement-breakpoint
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_id_key";--> statement-breakpoint
ALTER TABLE "classrooms" DROP CONSTRAINT "classrooms_id_key";--> statement-breakpoint
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_id_key";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_id_key";--> statement-breakpoint
ALTER TABLE "test_results" ADD COLUMN "id" serial;--> statement-breakpoint
ALTER TABLE "classroom_members" ADD PRIMARY KEY ("classroom_id","user_id");--> statement-breakpoint
ALTER TABLE "test_results" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "assignment_tests" ALTER COLUMN "expected_output" SET DATA TYPE text USING "expected_output"::text;--> statement-breakpoint
ALTER TABLE "assignments" ALTER COLUMN "description" SET DATA TYPE text USING "description"::text;--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "status" SET DATA TYPE "submission_status" USING "status"::"submission_status";--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "status" SET DEFAULT 'pending'::"submission_status";--> statement-breakpoint
ALTER TABLE "test_results" ALTER COLUMN "status" SET DATA TYPE "test_result_status" USING "status"::"test_result_status";--> statement-breakpoint
ALTER TABLE "test_results" ALTER COLUMN "stdout" SET DATA TYPE text USING "stdout"::text;--> statement-breakpoint
ALTER TABLE "test_results" ALTER COLUMN "stderr" SET DATA TYPE text USING "stderr"::text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "github_id" SET DATA TYPE bigint USING "github_id"::bigint;--> statement-breakpoint
ALTER TABLE "assignment_tests" DROP CONSTRAINT "assignment_tests_assignment_id_assignments_id_fkey", ADD CONSTRAINT "assignment_tests_assignment_id_assignments_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_classroom_id_classrooms_id_fkey", ADD CONSTRAINT "assignments_classroom_id_classrooms_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "classroom_members" DROP CONSTRAINT "classroom_members_classroom_id_classrooms_id_fkey", ADD CONSTRAINT "classroom_members_classroom_id_classrooms_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "classroom_members" DROP CONSTRAINT "classroom_members_user_id_users_id_fkey", ADD CONSTRAINT "classroom_members_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "classrooms" DROP CONSTRAINT "classrooms_owner_id_users_id_fkey", ADD CONSTRAINT "classrooms_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_assignment_id_assignments_id_fkey", ADD CONSTRAINT "submissions_assignment_id_assignments_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_student_id_users_id_fkey", ADD CONSTRAINT "submissions_student_id_users_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "test_results" DROP CONSTRAINT "test_results_submission_id_submissions_id_fkey", ADD CONSTRAINT "test_results_submission_id_submissions_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "test_results" DROP CONSTRAINT "test_results_test_id_assignment_tests_id_fkey", ADD CONSTRAINT "test_results_test_id_assignment_tests_id_fkey" FOREIGN KEY ("test_id") REFERENCES "assignment_tests"("id") ON DELETE CASCADE;