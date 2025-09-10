import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';

function AppLogo() {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-8 w-8 text-primary"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
      </svg>
    );
  }

export default function LoginPage() {
  return (
    <div className="mx-auto grid w-[350px] gap-6">
        <div className="grid gap-2 text-center">
        <div className="flex justify-center items-center gap-2">
            <AppLogo />
            <h1 className="text-3xl font-bold">SyncroSpace</h1>
        </div>
        <p className="text-balance text-muted-foreground">
            Enter your email below to login to your account
        </p>
        </div>
        <LoginForm />
        <div className="mt-4 text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="underline">
            Sign up
        </Link>
        </div>
    </div>
  );
}
