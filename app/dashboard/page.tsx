import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import DeletePollButton from "./DeletePollButton";
import CleanUpImagesButton from "./CleanUpImagesButton";


export default async function DashboardPage() {
  const user = await requireAuth();

  if (!user.isAdmin) {
    redirect("/");
  }

  const polls = await db.poll.findMany({
    include: {
      questions: {
        include: {
          options: true,
        },
      },
      tokens: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-xl font-bold">Polling Admin</Link>
              <div className="flex space-x-4">
                <Link href="/dashboard" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </Link>
                <Link href="/create-poll" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Create Poll
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">Logged in as: {user.email || "Admin"}</span>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-zinc-900">Poll Dashboard</h1>
            <div className="flex gap-3 items-center">
              <Link
                href="/dashboard/change-password"
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-900 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Change Password
              </Link>
              <CleanUpImagesButton pollCount={polls.length} />
              <Link
                href="/create-poll"
                className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Create New Poll
              </Link>
            </div>
         </div>

        {polls.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-lg text-zinc-600">No polls created yet.</p>
            <Link
              href="/create-poll"
              className="mt-4 inline-block bg-zinc-900 text-white px-4 py-2 rounded-md hover:bg-zinc-800 transition-colors"
            >
              Create Your First Poll
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {polls.map((poll: any) => (
              <div key={poll.id} className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">{poll.title}</h3>
                {poll.description && (
                  <p className="text-sm text-zinc-600 mb-4">{poll.description}</p>
                )}
                 <div className="space-y-2 text-sm text-zinc-600">
                   <div className="flex justify-between">
                     <span>Questions:</span>
                     <span className="font-medium">{poll.questions.length}</span>
                   </div>
                   <div className="flex justify-between">
                     <span>Links Generated:</span>
                     <span className="font-medium">{poll.tokens.length}</span>
                   </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-medium">{poll.tokens.length > 0 && poll.tokens.every((t: any) => t.used) ? "Closed" : "Open"}</span>
                    </div>
                 </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/poll/${poll.id}`}
                    className="flex-1 bg-zinc-100 text-zinc-900 text-center py-2 rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors"
                  >
                    View Results
                  </Link>
                  <Link
                    href={`/poll/${poll.id}/edit`}
                    className="flex-1 bg-zinc-900 text-white text-center py-2 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors"
                  >
                    Edit
                  </Link>
                  <DeletePollButton pollId={poll.id} pollTitle={poll.title} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
