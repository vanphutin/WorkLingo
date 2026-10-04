-- Preserve the database UUID defaults established by the auth migration.
-- Prisma's uuid() is client-generated; schema drift must not change raw inserts.
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "UserSession" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
