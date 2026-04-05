import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="w-full max-w-md mx-4 border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <h1 className="text-xl font-semibold">404 — Page Not Found</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          The page you requested does not exist.
        </p>
      </div>
    </div>
  );
}
