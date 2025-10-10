import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="max-w-md p-8 bg-popover border border-border rounded-lg">
        <h1 className="text-2xl font-semibold text-primary mb-2">
          Check your email
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          We've sent a confirmation email — please check your inbox and follow
          the link to complete account creation.
        </p>
        <div className="flex gap-2">
          <Link href="/" className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded transition-colors">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
