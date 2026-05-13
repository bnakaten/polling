import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  
  values.push(current);
  return values;
}

export async function POST(request: Request) {
  try {
    const authCookie = (await cookies()).get("auth_token");
    if (!authCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userId;
    try {
      const decoded = verify(authCookie.value, JWT_SECRET);
      userId = (decoded as { userId: number }).userId;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingUser = await db.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("csvFile") as File;

    if (!file) {
      return NextResponse.json({ error: "No CSV file provided" }, { status: 400 });
    }

    const allowedTypes = ["text/csv", "application/vnd.ms-excel"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only CSV files are allowed" }, { status: 400 });
    }

    const maxSize = 1024 * 1024;
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > maxSize) {
      return NextResponse.json({ error: "File size exceeds 1MB limit" }, { status: 400 });
    }

    const text = new TextDecoder().decode(bytes);
    
    let records: any[] = [];
    let pollTitle = "";
    let pollDescription = "";
    let pollUrl = "";
    let numVotingUrls = 1;
    let maxVotesPerUrl = 1;
    
    try {
      const lines = text.split("\n");
      if (lines.length === 0) {
        return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
      }
      
      let dataStartIndex = 0;
      
       console.log("Parsing CSV metadata...");
       for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        console.log(`Line ${i}: "${line.substring(0, 50)}..."`);
        
        if (line.toLowerCase().startsWith("# title:")) {
          let value = line.substring(8).trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          pollTitle = value;
          dataStartIndex = i + 1;
        } else if (line.toLowerCase().startsWith("# url:")) {
          let value = line.substring(6).trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          pollUrl = value;
          dataStartIndex = i + 1;
        } else if (line.toLowerCase().startsWith("# description:")) {
          let value = line.substring(14).trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          pollDescription = value;
          dataStartIndex = i + 1;
        } else if (line.toLowerCase().startsWith("# number of voting urls:")) {
          let value = line.substring(24).trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          const parsed = parseInt(value, 10);
          if (!isNaN(parsed) && parsed > 0) {
            numVotingUrls = parsed;
          }
          dataStartIndex = i + 1;
        } else if (line.toLowerCase().startsWith("# max votes per url:")) {
          let value = line.substring(20).trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          const parsed = parseInt(value, 10);
          if (!isNaN(parsed) && parsed > 0) {
            maxVotesPerUrl = parsed;
          }
          dataStartIndex = i + 1;
        } else {
          console.log(`Found data row at index ${i}`);
          dataStartIndex = i;
          break;
        }
      }
      console.log(`Final dataStartIndex: ${dataStartIndex}`);
      console.log(`pollTitle: "${pollTitle}", pollUrl: "${pollUrl}", pollDescription: "${pollDescription}"`);
      
      if (dataStartIndex >= lines.length) {
        return NextResponse.json({ error: "CSV file has no data rows" }, { status: 400 });
      }
      
      const headers = parseCsvLine(lines[dataStartIndex]).map(h => h.trim().toLowerCase());
      
      for (let i = dataStartIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCsvLine(line);
        const record: any = {};
        
        headers.forEach((header, index) => {
          record[header] = values[index]?.trim() || "";
        });
        
        records.push(record);
      }
    } catch (err) {
      return NextResponse.json({ error: "Invalid CSV format" }, { status: 400 });
    }

    if (records.length === 0) {
      return NextResponse.json({ error: "CSV file is empty or contains no data rows" }, { status: 400 });
    }

    const firstRow = records[0];
    
    const hasRequiredFields = 
      firstRow.hasOwnProperty("question");

    if (!hasRequiredFields) {
      return NextResponse.json({ 
        error: "CSV must have these columns: question. Optional: answer_type, option1, option2, etc." 
      }, { status: 400 });
    }

    const createdPoll = await db.$transaction(async (tx: any) => {
      const poll = await tx.poll.create({
        data: {
          userId,
          title: pollTitle,
          description: pollDescription,
          url: pollUrl,
          questions: {
            create: [],
          },
        },
        include: {
          questions: true,
        },
      });

      const questionsData: any[] = [];
      
      for (const record of records) {
        const questionText = record.question?.trim();
        if (!questionText) continue;

        const answerType = (record.answer_type || record["answer-type"] || record.answerType || "default").toLowerCase().trim();
        const validAnswerTypes = ["default", "rating", "textarea", "multirangeslider"];
        const finalAnswerType = validAnswerTypes.includes(answerType) ? answerType : "default";

        const questionOptions: any[] = [];
        const optionKeys = Object.keys(record).filter(key => 
          key.toLowerCase().startsWith("option")
        );

        for (const key of optionKeys) {
          const optionValue = record[key]?.trim();
          if (optionValue) {
            questionOptions.push({ text: optionValue });
          }
        }

        questionsData.push({
          text: questionText,
          category: record.category?.trim(),
          description: record.description?.trim(),
          answerType: finalAnswerType,
          options: questionOptions,
        });
      }

        await tx.poll.update({
          where: { id: poll.id },
          data: {
            questions: {
              create: questionsData.map((q: any) => ({
                text: q.text,
                category: q.category,
                description: q.description,
                answerType: q.answerType,
                options: {
                  create: q.options,
                },
              })),
            },
          },
        });

      for (let i = 0; i < numVotingUrls; i++) {
        const token = randomBytes(32).toString("hex");
        await tx.token.create({
          data: {
            token,
            pollId: poll.id,
            used: false,
            maxVotes: maxVotesPerUrl,
            voteCount: 0,
          },
        });
      }

      return poll;
    });

    return NextResponse.json({ 
      success: true, 
      poll: {
        id: createdPoll.id,
        title: createdPoll.title,
        description: createdPoll.description,
        url: createdPoll.url,
        questions: createdPoll.questions.map((q: any) => ({
          id: q.id,
          text: q.text,
          answerType: q.answerType,
          options: q.options.map((opt: any) => ({ id: opt.id, text: opt.text })),
        })),
      },
      numVotingUrls,
      maxVotesPerUrl,
    });
  } catch (error: any) {
    console.error("Error importing CSV poll:", error);
    return NextResponse.json({ error: "Failed to import CSV poll", details: error.message }, { status: 500 });
  }
}
