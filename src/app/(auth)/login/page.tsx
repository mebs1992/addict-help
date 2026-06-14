import { AuthForm } from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Welcome back</h1>
      <p className="muted mb-6">
        You showed up again. That matters more than any single day.
      </p>
      <AuthForm mode="login" />
    </div>
  );
}
