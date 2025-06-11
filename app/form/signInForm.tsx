'use client'

import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react"; // Import useState
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi"; // Import icons

export function SigninForm({ searchParams }: { searchParams: Message }) {
    const [showPassword, setShowPassword] = useState(false); // State for password visibility

    return (
        <form className="space-y-2"> {/* Makin dikurangi jarak vertikal antar grup input */}
            <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        name="email"
                        type="email" // Ensure type is email
                        placeholder="email@gmail.com"
                        required
                        className="w-full pl-10 pr-3 py-2.5 bg-white border-gray-300 focus:border-[#4A0E4E] focus:ring-[#4A0E4E] rounded-lg transition-all"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="password"
                        required
                        // Menambahkan kelas untuk mencoba menyembunyikan ikon password bawaan browser
                        // pr-12 untuk memberi ruang lebih bagi tombol kustom kita
                        className="w-full pl-10 pr-12 py-2.5 bg-white border-gray-300 focus:border-[#4A0E4E] focus:ring-[#4A0E4E] rounded-lg transition-all appearance-none [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                    />
                    {/* 
                      Tombol diposisikan absolut di dalam div relatif.
                      z-index ditingkatkan untuk mencoba menumpuk di atas ikon browser.
                    */}
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        // Menggunakan inset-y-0 untuk mengisi tinggi, items-center untuk vertikal align
                        // pr-3 untuk padding kanan di dalam tombol, memastikan ikon tidak terlalu mepet ke tepi
                        // z-20 untuk prioritas lebih tinggi
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-[#4A0E4E] cursor-pointer z-20"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                    </button>
                </div>
                {/* Link Forgot Password? dihilangkan */}
            </div>
            
            {/* Display FormMessage here, before the submit button, if it's an error */}
            {searchParams && "error" in searchParams && (
                <div className="pt-2 text-center"> {/* Added padding top for spacing and text-center */}
                    {/* Check for specific error code for invalid credentials */}
                    {searchParams.error === 'CredentialsSignin' ? (
                        <p className="text-sm text-red-600">email atau password yang Anda masukkan salah</p>
                    ) : (
                        // Fallback to the generic FormMessage component for other errors
                        <FormMessage message={searchParams} />
                    )}
                </div>
            )}
            
            <div className="pt-2"> {/* Adjusted margin-top to pt-2 for consistency */}
                <SubmitButton
                    formAction={signInAction}
                    pendingText="Signing in..."
                    className="w-full bg-gradient-to-r from-[#4A0E4E] to-[#8B0000] hover:from-[#5f1c63] hover:to-[#a10000] text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:ring-opacity-50"
                >
                    Sign In
                </SubmitButton>
            </div>
            {/* Display FormMessage here if it's a success or general message */}
            {/* Ensure this doesn't show if an error is already being displayed */}
            {searchParams && ("success" in searchParams || ("message" in searchParams && !("error" in searchParams))) && (
                 <FormMessage message={searchParams} />
            )}
        </form>
    );
}