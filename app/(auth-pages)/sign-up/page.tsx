// sign-up/page.tsx
import { Message } from "@/components/form-message";
import Link from "next/link";
import { SignupForm } from "@/app/form/signUpForm";
import { AlertNotification } from "@/components/alert-notification";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div
      className="min-h-screen flex items-center justify-center w-full px-8 py-12"
      style={{
        backgroundImage: "url('/slide1.jpg')", // Menggunakan gambar latar yang sama dengan sign-in
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        width: '100%',
        height: '100vh',
      }}
    >
      <div className="w-full max-w-lg bg-white bg-opacity-95 rounded-lg shadow-xl p-10 mx-4 overflow-y-auto max-h-[90vh]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-primary mb-2">Sign up</h1>
          <div className="h-1 w-16 bg-primary mx-auto rounded-full"></div>
          <p className="text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link className="text-primary font-medium hover:underline transition-all" href="/sign-in">
              Sign in
            </Link>
          </p>
        </div>

        {/* Alert notification for success or error */}
        {(("success" in searchParams) || ("error" in searchParams) || ("message" in searchParams)) && (
          <AlertNotification message={searchParams} />
        )}

        <SignupForm searchParams={searchParams} />
      </div>
    </div>
  );
}