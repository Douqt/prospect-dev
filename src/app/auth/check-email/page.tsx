import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="max-w-md p-8 bg-gray-900 border border-gray-800 rounded">
        <h1 className="text-2xl font-semibold text-[#e0a815] mb-2">
          Check your email
        </h1>
        <p className="text-sm text-gray-300 mb-4">
          We've sent a confirmation email — please check your inbox and follow
          the link to complete account creation.
        </p>
        <div className="flex gap-2">
          <Link href="/" className="px-4 py-2 bg-gray-800 rounded">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
