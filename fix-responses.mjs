import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./polling.db" });
const prisma = new PrismaClient({ adapter });

async function fix() {
  try {
    await prisma.response.update({
      where: { id: 7 },
      data: {
        optionId: null,
        text: "7",
      },
    });
    console.log("Fixed Response 7");
    
    const badResponses = await prisma.response.findMany({
      where: {
        optionId: { not: null },
        question: {
          answerType: { in: ["rating", "textarea"] },
        },
      },
    });
    
    console.log("Bad responses found:", badResponses.length);
    for (const r of badResponses) {
      console.log("Response " + r.id + ": Question " + r.questionId + ", optionId " + r.optionId + ", text \"" + r.text + "\"");
      await prisma.response.update({
        where: { id: r.id },
        data: {
          optionId: null,
          text: r.optionId.toString(),
        },
      });
      console.log("  Fixed Response " + r.id);
    }
    
    console.log("\nAll fixes applied!");
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
