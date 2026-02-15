import { LoginView } from "@/components/auth/login-view";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-screen">
      <LoginView />
    </div>
  );
}
