-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Question" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL,
    "answerType" TEXT NOT NULL DEFAULT 'default',
    "imageUrl" TEXT,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "pollId" INTEGER NOT NULL,
    CONSTRAINT "Question_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Question" ("answerType", "id", "imageUrl", "pollId", "text") SELECT "answerType", "id", "imageUrl", "pollId", "text" FROM "Question";
DROP TABLE "Question";
ALTER TABLE "new_Question" RENAME TO "Question";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
