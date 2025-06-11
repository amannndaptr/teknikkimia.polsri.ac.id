"use client";

import { useEffect, useState, useActionState } from "react"; // Import useActionState
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import SidebarMahasiswa from "@/components/SidebarMahasiswa";
import { createClient } from "@/utils/supabase/client";
import { changePasswordAction } from "@/app/actions"; // Ensure this import is correct
import { useFormStatus } from "react-dom"; // Keep useFormStatus
import { AlertNotification } from "@/components/alert-notification"; // Import the AlertNotification component
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
// This matches the return type of changePasswordAction
type ActionState = {
    type: 'success' | 'error' | null | string;
    message: string | null;
};

const initialState: ActionState = { // Use the defined ActionState type
    type: null,
    message: null,
};


export default function MahasiswaSettingsPage() {
    const [user, setUser] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    // Removed passwordFormLoading state as useActionState handles pending state

    const [passwordFormData, setPasswordFormData] = useState<PasswordFormState>({
        old_password: "",
        new_password: "",
        confirm_password: "",
    });

    const router = useRouter();
    const supabase = createClient();

    // State for server action messages for password form using useActionState
    // useActionState returns [state, dispatch, isPending]
    const [passwordMessage, passwordFormAction, isPasswordFormPending] = useActionState(changePasswordAction, initialState); 


    useEffect(() => {
        const checkAuth = async () => {
            setLoading(true);
            const { data: { user: sessionUser } } = await supabase.auth.getUser();

            if (!sessionUser) {
                console.log("No session found, redirecting to login from settings page.");
                router.replace("/sign-in");
                return;
            }

            setUser(sessionUser);
            setLoading(false);
        };

        checkAuth();

    }, [router, supabase]);

    const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordFormData(prev => ({ ...prev, [name]: value }));
    };

    // This function is kept to clear form fields after submission.
    const handlePasswordSubmit = async (formData: FormData) => {
        // useActionState automatically handles pending state, no need for manual setPasswordFormLoading
        // await passwordFormAction(formData); // Call the server action via form action prop

        setPasswordFormData({
            old_password: "",
            new_password: "",
            confirm_password: "",
        });
        // Note: The success/error message is handled by useActionState and AlertNotification
    };


    // Component to show pending state for form submissions
    const SubmitButton = ({ children }: { children: React.ReactNode }) => {
        const { pending } = useFormStatus();
        // Use isPasswordFormPending from useActionState to disable button
        return (
            <Button type="submit" disabled={pending || isPasswordFormPending} className="bg-sky-600 hover:bg-sky-700">
                {pending || isPasswordFormPending ? 'Memproses...' : children}
            </Button>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-sky-100"> {/* Latar diubah */}
                <div className="text-center text-sky-700 text-xl font-light tracking-wide animate-pulse"> {/* Warna teks diubah */}
                    Memuat pengaturan...
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-sky-100 text-sky-700 p-6 text-center"> {/* Latar dan warna teks diubah */}
                <div className="max-w-md">
                    <p className="text-xl mb-4">Anda tidak terautentikasi.</p>
                    <p className="text-sm mb-6">
                        Silakan login untuk mengakses halaman ini.
                    </p>
                    <button
                        onClick={() => router.replace('/sign-in')} // Tombol bisa menggunakan warna primer dari tema baru
                        className="bg-sky-600 text-white rounded-xl px-6 py-2 hover:bg-sky-700 transition-colors"
                    >
                        Kembali ke Halaman Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-sky-100 flex"> {/* Latar utama diubah ke sky-100 */}
            <SidebarMahasiswa />
            {/* Jadikan main sebagai flex container untuk menengahkan kontennya */}
            <main className="flex-1 p-6 md:p-10 flex flex-col items-center justify-center ml-72"> {/* Tambahkan ml-72 */}
                {/* Tambahkan w-full untuk konsistensi lebar dan pastikan mx-auto bekerja dengan items-center */}
                <div className="max-w-md w-full mx-auto space-y-8">

                    {passwordMessage && passwordMessage.message && (passwordMessage.type === 'success' || passwordMessage.type === 'error') && (
                        <AlertNotification
                            message={
                                passwordMessage.type === 'success' ? { success: passwordMessage.message } : { error: passwordMessage.message }
                            }
                        />
                    )}

                    <Card>
                        <CardHeader className="bg-sky-50 border-b border-sky-200"> {/* Latar header kartu disesuaikan */}
                            <CardTitle className="text-sky-700 text-center">Ganti Password</CardTitle> {/* Warna judul kartu diubah dan posisi ke tengah */}
                        </CardHeader>
                        <CardContent>
                            {/* Form action calls the server action directly */}
                            <form action={passwordFormAction} className="space-y-4 pt-4"> {/* Tambah padding atas jika header kartu punya latar */}
                                <div className="space-y-2">
                                    <Label htmlFor="old_password">Password Lama</Label>
                                    <Input
                                        id="old_password"
                                        name="old_password"
                                        type="password"
                                        value={passwordFormData.old_password}
                                        onChange={handlePasswordInputChange}
                                        className="border-sky-300 focus:border-sky-500 focus:ring-sky-500" // Styling input disesuaikan
                                        required
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
                                        className="border-sky-300 focus:border-sky-500 focus:ring-sky-500" // Styling input disesuaikan
                                        required
                                        minLength={6}
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
                                        className="border-sky-300 focus:border-sky-500 focus:ring-sky-500" // Styling input disesuaikan
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <SubmitButton> {/* Tombol SubmitButton akan menggunakan styling default dari Button, atau bisa di-override */}
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
