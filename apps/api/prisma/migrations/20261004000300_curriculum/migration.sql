-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'VALIDATED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('reading', 'listening', 'speaking', 'writing');

-- CreateEnum
CREATE TYPE "LearningBlockType" AS ENUM ('activate', 'readDecode', 'listenReason', 'respond');

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserSession" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "LearningPath" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" UUID NOT NULL,
    "pathId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cefrReference" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" UUID NOT NULL,
    "levelId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionLesson" (
    "missionId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "MissionLesson_pkey" PRIMARY KEY ("missionId","lessonId")
);

-- CreateTable
CREATE TABLE "LessonVersion" (
    "id" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceHash" TEXT NOT NULL,
    "parsedContent" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBlock" (
    "id" UUID NOT NULL,
    "lessonVersionId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" UUID NOT NULL,
    "lessonVersionId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "learningBlock" "LearningBlockType" NOT NULL,
    "order" INTEGER NOT NULL,
    "skills" "ActivityType"[],
    "contentReferences" TEXT[],
    "languageBlockReferences" TEXT[],
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordBank" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonVersionWordBank" (
    "lessonVersionId" UUID NOT NULL,
    "wordBankId" UUID NOT NULL,

    CONSTRAINT "LessonVersionWordBank_pkey" PRIMARY KEY ("lessonVersionId","wordBankId")
);

-- CreateTable
CREATE TABLE "LanguageBlock" (
    "id" UUID NOT NULL,
    "wordBankId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "canonicalForm" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "pronunciation" TEXT NOT NULL,
    "collocations" TEXT[],
    "grammarPattern" TEXT NOT NULL,
    "examples" TEXT[],
    "commonErrors" TEXT[],
    "cefrLevel" TEXT NOT NULL,
    "transferContexts" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanguageBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearningPath_slug_key" ON "LearningPath"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Level_code_key" ON "Level"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Level_pathId_order_key" ON "Level"("pathId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Mission_slug_key" ON "Mission"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Mission_levelId_order_key" ON "Mission"("levelId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_slug_key" ON "Lesson"("slug");

-- CreateIndex
CREATE INDEX "MissionLesson_lessonId_idx" ON "MissionLesson"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "MissionLesson_missionId_order_key" ON "MissionLesson"("missionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "LessonVersion_lessonId_version_key" ON "LessonVersion"("lessonId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ContentBlock_lessonVersionId_slug_key" ON "ContentBlock"("lessonVersionId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ContentBlock_lessonVersionId_order_key" ON "ContentBlock"("lessonVersionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_lessonVersionId_slug_key" ON "Activity"("lessonVersionId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_lessonVersionId_order_key" ON "Activity"("lessonVersionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "WordBank_slug_key" ON "WordBank"("slug");

-- CreateIndex
CREATE INDEX "LessonVersionWordBank_wordBankId_idx" ON "LessonVersionWordBank"("wordBankId");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageBlock_slug_key" ON "LanguageBlock"("slug");

-- CreateIndex
CREATE INDEX "LanguageBlock_wordBankId_idx" ON "LanguageBlock"("wordBankId");

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "LearningPath"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionLesson" ADD CONSTRAINT "MissionLesson_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionLesson" ADD CONSTRAINT "MissionLesson_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonVersion" ADD CONSTRAINT "LessonVersion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBlock" ADD CONSTRAINT "ContentBlock_lessonVersionId_fkey" FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_lessonVersionId_fkey" FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonVersionWordBank" ADD CONSTRAINT "LessonVersionWordBank_lessonVersionId_fkey" FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonVersionWordBank" ADD CONSTRAINT "LessonVersionWordBank_wordBankId_fkey" FOREIGN KEY ("wordBankId") REFERENCES "WordBank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageBlock" ADD CONSTRAINT "LanguageBlock_wordBankId_fkey" FOREIGN KEY ("wordBankId") REFERENCES "WordBank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Published snapshots are append-only; subsequent edits require a new version.
CREATE FUNCTION protect_published_lesson_version() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" = 'PUBLISHED' THEN
    RAISE EXCEPTION 'Published lesson versions are immutable' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lesson_version_immutable
BEFORE UPDATE OR DELETE ON "LessonVersion"
FOR EACH ROW EXECUTE FUNCTION protect_published_lesson_version();

-- Lock both old and new parents: moving a child must not bypass the guard,
-- and a concurrent publish must serialize with child writes.
CREATE FUNCTION protect_published_lesson_child() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  parent_ids uuid[] := ARRAY[]::uuid[];
  parent_status text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    parent_ids := array_append(parent_ids, OLD."lessonVersionId");
  END IF;
  IF TG_OP <> 'DELETE' THEN
    parent_ids := array_append(parent_ids, NEW."lessonVersionId");
  END IF;
  FOR parent_status IN EXECUTE format(
    'SELECT "status"::text FROM %I."LessonVersion" WHERE "id" = ANY($1) ORDER BY "id" FOR UPDATE',
    TG_TABLE_SCHEMA
  ) USING parent_ids LOOP
    IF parent_status = 'PUBLISHED' THEN
      RAISE EXCEPTION 'Published lesson content is immutable' USING ERRCODE = '55000';
    END IF;
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER content_block_immutable
BEFORE INSERT OR UPDATE OR DELETE ON "ContentBlock"
FOR EACH ROW EXECUTE FUNCTION protect_published_lesson_child();

CREATE TRIGGER activity_immutable
BEFORE INSERT OR UPDATE OR DELETE ON "Activity"
FOR EACH ROW EXECUTE FUNCTION protect_published_lesson_child();

CREATE TRIGGER lesson_word_bank_immutable
BEFORE INSERT OR UPDATE OR DELETE ON "LessonVersionWordBank"
FOR EACH ROW EXECUTE FUNCTION protect_published_lesson_child();

ALTER TABLE "LessonVersion" ADD CONSTRAINT "lesson_version_positive" CHECK ("version" > 0);
