import Link from "next/link";

export default function ConfirmedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="max-w-md p-8 bg-gray-900 border border-gray-800 rounded">
        <h1 className="text-2xl font-semibold text-[#e0a815] mb-2">
          Email confirmed
        </h1>
        <p className="text-sm text-gray-300 mb-4">
          Thanks — your email is confirmed. You can now sign in.
        </p>
        <div className="flex gap-2">
          <Link
            href="/login"
            className="px-4 py-2 bg-[#e0a815] text-black rounded"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
