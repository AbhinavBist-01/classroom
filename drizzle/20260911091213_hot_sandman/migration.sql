CREATE TYPE "classroom_role" AS ENUM('owner', 'ta', 'student');--> statement-breakpoint
ALTER TABLE "classroom_members" DROP CONSTRAINT IF EXISTS "classroom_members_user_id_users_id_fkey";--> statement-breakpoint
ALTER TABLE "classrooms" DROP CONSTRAINT IF EXISTS "classrooms_owner_id_users_id_fkey";--> statement-breakpoint
ALTER TABLE "submissions" DROP CONSTRAINT IF EXISTS "submissions_student_id_users_id_fkey";--> statement-breakpoint
DROP TABLE IF EXISTS "users";--> statement-breakpoint
ALTER TABLE "classroom_members" ALTER COLUMN "user_id" SET DATA TYPE text USING "user_id"::text;--> statement-breakpoint
ALTER TABLE "classroom_members" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "classroom_members" ALTER COLUMN "role" SET DATA TYPE "classroom_role" USING "role"::text::"classroom_role";--> statement-breakpoint
ALTER TABLE "classroom_members" ALTER COLUMN "role" SET DEFAULT 'student'::"classroom_role";--> statement-breakpoint
ALTER TABLE "classrooms" ALTER COLUMN "owner_id" SET DATA TYPE text USING "owner_id"::text;--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "student_id" SET DATA TYPE text USING "student_id"::text;--> statement-breakpoint
ALTER TABLE "classroom_members" ADD CONSTRAINT "classroom_members_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_owner_id_user_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_user_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE CASCADE;