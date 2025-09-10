import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto grid w-[350px] gap-6">
        <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Forgot Password</h1>
            <p className="text-balance text-muted-foreground">
                Enter your email to receive a reset link.
            </p>
        </div>
        <ForgotPasswordForm />
        <div className="mt-4 text-center text-sm">
        <Link href="/login" className="inline-flex items-center text-muted-foreground hover:text-primary">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Log In
        </Link>
        </div>
    </div>
  );
}
