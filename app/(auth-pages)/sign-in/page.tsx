import { FormMessage, Message } from "@/components/form-message";
import Link from "next/link";
import { SigninForm } from "@/app/form/signInForm";

export default async function SignIn(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  if ("message" in searchParams) {
    return (
      <div className="w-full flex-1 flex items-center h-screen sm:max-w-md justify-center gap-2 p-4">
        <FormMessage message={searchParams} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center w-full"
      style={{
        backgroundImage: "url('/slide1.jpg')", // PASTIKAN PATH INI BENAR & FOTO ADA DI FOLDER PUBLIC
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        width: '100%',
        height: '100vh',
      }}
    >
      <div className="w-full max-w-xs bg-white bg-opacity-95 rounded-lg shadow-xl px-8 py-3 mx-4">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full">
            <div className="mb-2 text-center"> {/* Jarak bawah grup judul ke form */}
              <h1 
                className="inline-block text-2xl font-semibold text-primary relative pb-1.5 after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-full after:bg-primary after:rounded-full"
              >
                Welcome back!
              </h1>
            </div>
            
            <SigninForm searchParams={searchParams} />
            <p className="text-xs text-muted-foreground mt-1 text-center"> {/* Mengubah ukuran font menjadi text-xs */}
              Don't have an account?{" "}
              <Link className="text-primary font-medium hover:underline transition-all" href="/sign-up">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}