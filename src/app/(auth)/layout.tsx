import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="app-bg flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <span className="text-2xl">🎰</span>
          <span className="font-semibold">The Cost of One Spin</span>
        </Link>
        {children}
      </div>
    </main>
  );
}
