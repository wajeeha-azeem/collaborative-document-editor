-- CreateEnum (idempotent for environments that already received a db push)
DO $$ BEGIN
  CREATE TYPE "ShareRole" AS ENUM ('VIEW', 'EDIT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "DocumentShare" ADD COLUMN IF NOT EXISTS "role" "ShareRole" NOT NULL DEFAULT 'EDIT';
