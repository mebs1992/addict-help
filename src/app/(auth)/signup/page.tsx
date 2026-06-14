import { AuthForm } from '@/components/AuthForm';

export default function SignupPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Start taking control</h1>
      <p className="muted mb-6">
        No judgement, no cold turkey. Just awareness, a small plan, and progress
        you can see.
      </p>
      <AuthForm mode="signup" />
    </div>
  );
}
