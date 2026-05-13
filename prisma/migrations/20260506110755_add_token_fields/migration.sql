-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Token" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "pollId" INTEGER NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "maxVotes" INTEGER NOT NULL DEFAULT 1,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Token_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Token" ("createdAt", "id", "pollId", "token", "used") SELECT "createdAt", "id", "pollId", "token", "used" FROM "Token";
DROP TABLE "Token";
ALTER TABLE "new_Token" RENAME TO "Token";
CREATE UNIQUE INDEX "Token_token_key" ON "Token"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
