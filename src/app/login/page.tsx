import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Sprout } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sprout className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold">Arva Projects Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Scope-3 program management
          </p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
