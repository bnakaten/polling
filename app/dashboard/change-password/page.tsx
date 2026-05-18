import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import ChangePasswordForm from "@/app/dashboard/ChangePasswordForm";

export default async function ChangePasswordPage() {
  const user = await requireAuth();

  if (!user.isAdmin) {
    redirect("/");
  }

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

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/dashboard"
          className="inline-block text-zinc-600 hover:text-zinc-900 mb-4"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-zinc-900 mb-8">Change Password</h1>

        <ChangePasswordForm />
      </main>
    </div>
  );
}
