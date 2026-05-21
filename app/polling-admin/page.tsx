import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
  const isAuthenticated = false; // Will be implemented with auth

  if (isAuthenticated) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-zinc-900">Polling System</h1>
          <p className="text-lg text-zinc-600">Secure, single-use voting links with real-time results</p>
        </div>

        <div className="flex flex-col gap-4">
          <Link
            href="/login"
            className="block w-full py-3 px-6 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="block w-full py-3 px-6 border border-zinc-300 text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            Register
          </Link>
        </div>

        <div className="mt-8 text-sm text-zinc-500">
          <p>Admin login available for poll creation and results viewing</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-zinc-900">Polling System</h1>
          <p className="text-lg text-zinc-600">Secure, single-use voting links with real-time results</p>
        </div>

        <div className="flex flex-col gap-4">
          <Link
            href="/login"
            className="block w-full py-3 px-6 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="block w-full py-3 px-6 border border-zinc-300 text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            Register
          </Link>
        </div>

        <div className="mt-8 text-sm text-zinc-500">
          <p>Admin login available for poll creation and results viewing</p>
        </div>
      </div>
    </div>
  );
}
