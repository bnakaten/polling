import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { searchParams } = new URL(request.url);
  const includeTokens = searchParams.get("includeTokens") === "true";
  try {
    const { id } = await params;
    const pollId = parseInt(id);
    
    const poll = await db.poll.findUnique({
      where: { id: pollId },
      include: {
        questions: {
          include: {
            options: {
              include: {
                responses: {
                  include: {
                    tokenRel: true,
                  },
                },
              },
            },
            responses: {
              include: {
                tokenRel: true,
              },
            },
          },
        },
        tokens: true,
      },
    });

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Poll ID,${pollId}\n`;
    csvContent += `Poll Title,"${poll.title.replace(/"/g, '""')}"\n`;
    csvContent += `Poll Description,"${(poll.description || "").replace(/"/g, '""')}"\n`;
    csvContent += "\n";

    if (includeTokens && poll.tokens && poll.tokens.length > 0) {
      csvContent += "TOKEN BREAKDOWN\n";
      csvContent += "Token ID,Used,Max Votes,Vote Count,Question ID,Question Text,Answer Type,Response\n";
      
      poll.tokens.forEach((token: any) => {
        const tokenResponses = poll.questions.flatMap((question: any) => 
          question.responses.filter((r: any) => {
            if (r.tokenRel) return r.tokenRel.token === token.token;
            if (r.token) return r.token === token.token;
            return false;
          })
        );
        
        tokenResponses.forEach((response: any) => {
          const question = poll.questions.find((q: any) => q.id === response.questionId);
          const optionText = response.optionId 
            ? question?.options.find((o: any) => o.id === response.optionId)?.text 
            : response.text || "";
          
          csvContent += `${token.token},${token.used},${token.maxVotes},${token.voteCount},${response.questionId},"${question?.text.replace(/"/g, '""')}",${question?.answerType || "default"},"${String(optionText || '').replace(/"/g, '""')}"\n`;
        });
      });
      
      csvContent += "\n";
    }

    csvContent += "QUESTION SUMMARY\n";
    
    const results = poll.questions.map((question: any) => {
      const needsOptions = question.answerType === "default" || !question.answerType;
      
      if (needsOptions) {
        return {
          questionId: question.id,
          text: question.text,
          answerType: question.answerType,
          options: question.options.map((option: any) => ({
            optionId: option.id,
            text: option.text,
            count: option.responses.length,
          })),
        };
      }
      
      const totalResponses = question.responses.length;
      
      if (question.answerType === "rating") {
        const responseValues = question.responses.map((r: any) => parseInt(r.text || "0"));
        
        const ratingCounts: Record<string, number> = {};
        responseValues.forEach((val: number) => {
          const key = val.toString();
          ratingCounts[key] = (ratingCounts[key] || 0) + 1;
        });
        
        const ratingOptions = Object.keys(ratingCounts)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map(val => ({
            optionId: parseInt(val),
            text: val,
            count: ratingCounts[val],
          }));
        
        return {
          questionId: question.id,
          text: question.text,
          answerType: question.answerType,
          options: ratingOptions,
          individualResponses: question.responses.map((r: any) => r.text),
        };
      }
      
      return {
        questionId: question.id,
        text: question.text,
        answerType: question.answerType,
        options: [
          {
            optionId: 0,
            text: totalResponses > 0 ? `${totalResponses} response${totalResponses !== 1 ? "s" : ""}` : "No responses yet",
            count: totalResponses,
          },
        ],
        individualResponses: question.responses.map((r: any) => r.text),
      };
    });

    results.forEach((result: any) => {
      csvContent += `Question ID,${result.questionId}\n`;
      csvContent += `Question Text,"${result.text.replace(/"/g, '""')}"\n`;
      csvContent += `Answer Type,${result.answerType || "default"}\n`;
      
      if (result.individualResponses && result.individualResponses.length > 0) {
        csvContent += "Response Text\n";
        result.individualResponses.forEach((response: string | null) => {
          csvContent += `"${String(response || '').replace(/"/g, '""')}"\n`;
        });
      } else {
        csvContent += "Option ID,Option Text,Count\n";
        result.options.forEach((option: any) => {
          csvContent += `${option.optionId},"${option.text.replace(/"/g, '""')}",${option.count}\n`;
        });
      }
      
      csvContent += "\n";
    });

    const fileName = `poll_${pollId}_${poll.title.replace(/\s+/g, '_')}_results.csv`;
    const encodedUri = encodeURI(csvContent);

    return NextResponse.json({ 
      success: true, 
      fileName,
      csvData: encodedUri
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch poll data" }, { status: 500 });
  }
}
