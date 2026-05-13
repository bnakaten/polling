const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const adapter = new PrismaBetterSqlite3({
  url: "file:./polling.db",
});

const prisma = new PrismaClient({ adapter });

async function test() {
  try {
    const token = "172afe2a4316b398d363d484c5f611e0839f7150bca7bc549360c595017e9f2c";
    
    const tokenRecord = await prisma.token.findUnique({
      where: { token },
      include: { poll: true },
    });
    
    console.log("Token record:", tokenRecord);
    
    if (!tokenRecord) {
      console.log("Token not found");
      return;
    }
    
    if (tokenRecord.used) {
      console.log("Token already used");
      return;
    }
    
    const questionId = 1;
    const optionId = 1;
    
    const response = await prisma.response.create({
      data: {
        token: tokenRecord.token,
        questionId: questionId,
        optionId: optionId,
      },
    });
    
    console.log("Response created:", response);
  } catch (e) {
    console.error("Error:", e.message);
    console.error("Full error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test().catch(console.error);
