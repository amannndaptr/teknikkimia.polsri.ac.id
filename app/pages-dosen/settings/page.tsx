"use client";

import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import SidebarDosen from "@/components/SidebarDosen";
import { createClient } from "@/utils/supabase/client";
import { changeDosenPasswordAction } from "@/app/dosen_actions";
import { useFormStatus } from "react-dom";
import { AlertNotification } from "@/components/alert-notification"; // Assuming this component exists
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


type PasswordFormState = {
    old_password: string;
    new_password: string;
    confirm_password: string;
};

// Define the type for the state managed by useActionState
type ActionState = {
    type: 'success' | 'error' | null | string;
    message: string | null;
};

const initialState: ActionState = {
    type: null,
    message: null,
};


export default function DosenSettingsPage() {
    const [user, setUser] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    const [passwordFormData, setPasswordFormData] = useState<PasswordFormState>({
        old_password: "",
        new_password: "",
        confirm_password: "",
    });

    const router = useRouter();
    const supabase = createClient();

    // useActionState returns [state, dispatch, isPending]
    const [passwordMessage, passwordFormAction, isPasswordFormPending] = useActionState(changeDosenPasswordAction, initialState);


    useEffect(() => {
        const checkAuthAndRole = async () => {
            setLoading(true);
            const { data: { user: sessionUser } } = await supabase.auth.getUser();

            if (!sessionUser) {
                console.log("User not authenticated or not a dosen, redirecting to login.");
                router.replace("/sign-in");
                return;
            }

            setUser(sessionUser);
            setLoading(false);
        };

        checkAuthAndRole();

    }, [router, supabase]);

    const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordFormData(prev => ({ ...prev, [name]: value }));
    };

    // This function is kept to clear form fields after submission.
    const handlePasswordSubmit = async (formData: FormData) => {
        setPasswordFormData({
            old_password: "",
            new_password: "",
            confirm_password: "",
        });
    };

    // Component to show pending state for form submissions
    const SubmitButton = ({ children }: { children: React.ReactNode }) => {
        const { pending } = useFormStatus();
        // Use isPasswordFormPending from useActionState to disable button
        return (
            <Button 
                type="submit" 
                disabled={pending || isPasswordFormPending}
                className="bg-teal-700 text-white rounded-xl px-6 py-2.5 hover:bg-teal-800 transition-colors focus-visible:ring-teal-500" // Menambahkan kelas styling
            >
                {pending || isPasswordFormPending ? 'Memproses...' : children}
            </Button>
        );
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#B3C7D6] to-[#A8B8C8] transition-all duration-500"> {/* Latar loading disesuaikan */}
                <div className="text-center text-gray-700 text-xl font-light tracking-wide animate-pulse"> {/* Teks loading disesuaikan */}
                    Memuat pengaturan dosen...
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#B3C7D6] to-[#A8B8C8] text-gray-700 p-6 text-center"> {/* Latar dan teks disesuaikan */}
                <div className="max-w-md">
                    <p className="text-xl mb-4">Akses ditolak.</p>
                    <p className="text-sm mb-6">
                        Anda harus login sebagai dosen untuk mengakses halaman ini.
                    </p>
                    <button
                        onClick={() => router.replace('/sign-in')}
                        className="bg-white text-teal-700 rounded-xl px-6 py-2 hover:bg-gray-100 transition-colors" // Warna teks tombol disesuaikan
                    >
                        Kembali ke Halaman Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#D1D9E6] flex"> {/* Latar belakang halaman disesuaikan dengan tema sidebar */}
            <SidebarDosen />
            {/* Jadikan main sebagai flex container untuk menengahkan kontennya */}
            <main className="flex-1 p-6 md:p-10 flex flex-col items-center justify-center">
                <div className="max-w-md w-full mx-auto space-y-8"> {/* Tambahkan w-full untuk konsistensi lebar */}

                    {/* Pass passwordMessage directly, AlertNotification now expects ActionState shape */}
                    {/* Check if message exists before rendering AlertNotification */}
                    {passwordMessage && passwordMessage.message && (passwordMessage.type === 'success' || passwordMessage.type === 'error') && (
                        <AlertNotification
                            message={
                                passwordMessage.type === 'success' ? { success: passwordMessage.message } : { error: passwordMessage.message }
                            }
                        />
                    )}

                    <Card className="bg-[#BAC3D0] border-gray-400"> {/* Menyesuaikan warna card */}
                        <CardHeader>
                            <CardTitle className="text-teal-800 text-center">Ganti Password</CardTitle> {/* Menyesuaikan warna judul card dan posisi ke tengah */}
                        </CardHeader>
                        <CardContent>
                            {/* Form action calls the server action directly */}
                            <form action={passwordFormAction} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="old_password">Password Lama</Label>
                                    <Input
                                        id="old_password"
                                        name="old_password"
                                        type="password"
                                        value={passwordFormData.old_password}
                                        onChange={handlePasswordInputChange}
                                        required
                                        className="bg-slate-50 border-gray-300 focus:border-teal-500 focus:ring-teal-500" // Menyesuaikan warna input
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new_password">Password Baru</Label>
                                    <Input
                                        id="new_password"
                                        name="new_password"
                                        type="password"
                                        value={passwordFormData.new_password}
                                        onChange={handlePasswordInputChange}
                                        required
                                        minLength={6}
                                        className="bg-slate-50 border-gray-300 focus:border-teal-500 focus:ring-teal-500" // Menyesuaikan warna input
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm_password">Konfirmasi Password Baru</Label>
                                    <Input
                                        id="confirm_password"
                                        name="confirm_password"
                                        type="password"
                                        value={passwordFormData.confirm_password}
                                        onChange={handlePasswordInputChange}
                                        required
                                        minLength={6}
                                        className="bg-slate-50 border-gray-300 focus:border-teal-500 focus:ring-teal-500" // Menyesuaikan warna input
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <SubmitButton>
                                        Simpan Perubahan
                                    </SubmitButton>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                </div>
            </main>
        </div>
    );
}
