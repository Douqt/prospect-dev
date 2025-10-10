import Link from "next/link";

export default function ConfirmedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="max-w-md p-8 bg-popover border border-border rounded-lg">
        <h1 className="text-2xl font-semibold text-primary mb-2">
          Email confirmed
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          Thanks — your email is confirmed. You can now sign in.
        </p>
        <div className="flex gap-2">
          <Link
            href="/login"
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
