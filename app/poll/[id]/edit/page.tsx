import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { cookies } from "next/headers";
import { EditPollFormClient } from "./EditPollFormClient";

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

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    let imageUrl = formData.get("imageUrl") as string;

    const file = formData.get("image") as File;
    if (file && file.size > 0) {
      const uploadFormData = new FormData();
      uploadFormData.append("image", file);
      try {
        const uploadResponse = await fetch("http://localhost:3000/api/upload-image", {
          method: "POST",
          headers: authCookie ? { Cookie: `auth_token=${authCookie.value}` } : undefined,
          body: uploadFormData,
        });
        const uploadData = await uploadResponse.json();
        if (uploadResponse.ok) {
          imageUrl = uploadData.imageUrl;
        }
      } catch (err) {
        console.error("Failed to upload image:", err);
      }
    }

    const questionData: any[] = [];
    const questionCount = parseInt(formData.get("questionCount") as string || "0");

      for (let i = 0; i < questionCount; i++) {
        const questionText = formData.get(`question_${i}_text`) as string;
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
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (authCookie) {
        headers.Cookie = `auth_token=${authCookie.value}`;
      }

      const response = await fetch(`http://localhost:3000/api/polls/${poll.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          title,
          description,
          imageUrl: imageUrl || null,
          questions: questionData.filter((q) => q.text.trim()),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update poll");
      }
    } catch (err) {
      console.error("Failed to update poll:", err);
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

