import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { cookies } from "next/headers";
import { EditPollFormClient } from "./EditPollFormClient";
import { unlink, stat } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

export default async function EditPollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pollId = parseInt(id);
  
  const poll = await db.poll.findUnique({
    where: { id: pollId },
    include: {
      questions: {
        include: {
          options: true,
        },
      },
    },
  });
  
  if (!poll) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-zinc-900">Error</h2>
          <p className="text-zinc-600">Poll not found</p>
          <Link href="/dashboard" className="mt-4 inline-block text-zinc-900 underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const initialQuestions = poll.questions.map((q: any) => ({
    id: q.id,
    text: q.text,
    category: q.category || "",
    description: q.description || "",
    answerType: q.answerType || "default",
    imageUrl: q.imageUrl,
    isOptional: q.isOptional || false,
    options: q.options.map((o: any) => ({ id: o.id, text: o.text })),
  }));

  return (
    <EditPollForm poll={poll} initialQuestions={initialQuestions} initialQuestionCount={poll.questions.length} />
  );
}

interface EditPollFormProps {
  poll: any;
  initialQuestions: any[];
  initialQuestionCount: number;
}

async function EditPollForm({ poll, initialQuestions }: EditPollFormProps) {
  "use server";

  const updatePoll = async (formData: FormData) => {
    "use server";

    const authCookie = (await cookies()).get("auth_token");

    if (!authCookie) {
      throw new Error("Unauthorized");
    }

    let userId;
    try {
      const decoded = (await import("jsonwebtoken")).verify(authCookie.value, process.env.JWT_SECRET || "your-secret-key-change-this");
      userId = (decoded as { userId: number }).userId;
    } catch {
      throw new Error("Unauthorized");
    }

    if (poll.userId !== userId) {
      throw new Error("Not authorized to update this poll");
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const imageUrlRaw = formData.get("imageUrl");
    const imageUrl = imageUrlRaw === "" ? null : (imageUrlRaw as string | null);
    console.log("[DEBUG] imageUrl from form:", imageUrlRaw, "parsed:", imageUrl);

    const questionData: any[] = [];
    const questionCount = parseInt(formData.get("questionCount") as string || "0");

      for (let i = 0; i < questionCount; i++) {
        const questionText = formData.get(`question_${i}_text`) as string || "";
        if (!questionText.trim()) {
          console.warn(`[WARN] Question ${i} has empty text, skipping`);
          continue;
        }
        const questionId = parseInt(formData.get(`question_${i}_id`) as string || "0");
        const questionCategory = formData.get(`question_${i}_category`) as string || "";
        const questionDescription = formData.get(`question_${i}_description`) as string || "";
        const optionCount = parseInt(formData.get(`question_${i}_optionCount`) as string || "0");
        const answerType = formData.get(`answerType_${i}`) as string || "default";
        const questionImageUrl = formData.get(`question_${i}_imageUrl`) as string;
        const isOptionalRaw = formData.get(`question_${i}_isOptional`);
        const isOptional = isOptionalRaw === "true" || isOptionalRaw === "on";

        console.log(`[DEBUG] Question ${i}: answerType=${answerType}, isOptionalRaw=${isOptionalRaw}, isOptional=${isOptional}`);

        const options: any[] = [];
        for (let j = 0; j < optionCount; j++) {
          const optionText = formData.get(`question_${i}_option_${j}_text`) as string;
          const optionId = parseInt(formData.get(`question_${i}_option_${j}_id`) as string || "0");
          if (optionText && optionText.trim()) {
            options.push({ id: optionId, text: optionText });
          }
        }

        questionData.push({
          id: questionId,
          text: questionText,
          category: questionCategory,
          description: questionDescription,
          answerType,
          imageUrl: questionImageUrl || null,
          isOptional,
          options: options.filter((o) => o.text.trim()),
        });
      }

    try {
      await db.$transaction(
        questionData.filter((q) => q.text.trim()).map((q: any) =>
          db.question.upsert({
            where: { id: q.id },
            update: {
              text: q.text,
              category: q.category || null,
              description: q.description || null,
              answerType: q.answerType || "default",
              imageUrl: q.imageUrl || null,
              isOptional: q.isOptional || false,
            },
            create: {
              text: q.text,
              category: q.category || null,
              description: q.description || null,
              answerType: q.answerType || "default",
              imageUrl: q.imageUrl || null,
              isOptional: q.isOptional || false,
              pollId: poll.id,
              options: q.answerType === "multirangeslider" ? undefined : {
                create: q.options?.map((opt: any) => ({ text: opt.text })) || [],
              },
            },
          })
        )
      );

      await db.poll.update({
        where: { id: poll.id },
        data: {
          title,
          description: description || "",
          imageUrl: imageUrl || null,
        },
      });
    } catch (err) {
      console.error("Failed to update poll:", err);
      throw new Error("Failed to update poll");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <a href="/dashboard" className="text-xl font-bold">Polling Admin</a>
              <div className="flex space-x-4">
                <a href="/dashboard" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={`/poll/${poll.id}`}
          className="inline-block text-zinc-600 hover:text-zinc-900 mb-4"
        >
          ← Back to Results
        </Link>

        <h1 className="text-2xl font-bold text-zinc-900 mb-8">Edit Poll</h1>

        <EditPollFormClient poll={poll} initialQuestions={initialQuestions} initialQuestionCount={poll.questions.length} onSubmit={updatePoll} />
      </main>
    </div>
  );
}

