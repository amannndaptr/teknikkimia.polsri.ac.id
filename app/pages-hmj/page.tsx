"use client";

import React, { useEffect, useState } from "react"; // Mengimpor React secara eksplisit jika belum
import { useRouter } from "next/navigation";
import SidebarHMJ from "@/components/SidebarHMJ"; // Pastikan path ini benar
import { createClient } from "@/utils/supabase/client";
import { FiActivity, FiFileText, FiUsers, FiPlusSquare, FiList } from "react-icons/fi"; // Contoh ikon

interface UserData {
    email?: string;
    // Tambahkan field lain jika perlu, misalnya nama HMJ jika disimpan di metadata
}

export default function DashboardHMJ() {
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [totalKegiatan, setTotalKegiatan] = useState<number>(0);
    const [totalBerita, setTotalBerita] = useState<number>(0);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        async function fetchUserData() {
            try {
                const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

                if (authError || !authUser) {
                    console.error("Authentication error:", authError?.message);
                    router.push("/sign-in");
                    return;
                }

                const userRole = authUser.user_metadata?.role;
                if (userRole !== "hmj") {
                    console.warn("User is not HMJ, redirecting.");
                    router.push("/sign-in"); // Arahkan jika bukan HMJ
                    return;
                }

                setUser({ email: authUser.email });

                // Ambil jumlah berita
                const { count: beritaCount, error: beritaError } = await supabase
                    .from('berita') // Asumsi nama tabel berita adalah 'berita'
                    .select('*', { count: 'exact', head: true });
                
                if (beritaError) {
                    console.error("Error fetching berita count:", beritaError.message);
                } else {
                    setTotalBerita(beritaCount || 0);
                }

                // Ambil jumlah kegiatan
                const { count: kegiatanCount, error: kegiatanError } = await supabase
                    .from('kegiatan')
                    .select('*', { count: 'exact', head: true });

                if (kegiatanError) {
                    console.error("Error fetching kegiatan count:", kegiatanError.message);
                } else {
                    setTotalKegiatan(kegiatanCount || 0);
                }

            } catch (error) {
                console.error("Error fetching user data for HMJ dashboard:", error);
                // Pertimbangkan untuk mengarahkan ke halaman login atau menampilkan pesan error umum di sini
            } finally {
                setLoading(false);
            }
        }

        fetchUserData();
    }, [router, supabase]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background"> {/* Menggunakan warna background dari theme-hmj */}
                <div className="text-xl font-semibold text-gray-700 animate-pulse">Memuat Dashboard HMJ...</div>
            </div>
        );
    }

    if (!user) {
        // Seharusnya sudah dihandle oleh redirect di useEffect, tapi sebagai fallback
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <div className="text-xl font-semibold text-red-600">Gagal memuat data pengguna HMJ. Silakan coba login kembali.</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex theme-hmj"> {/* Menggunakan class theme-hmj */}
            <SidebarHMJ />
            <main className="flex-1 p-6 md:p-10 ml-72 overflow-y-auto"> {/* ml-72 disesuaikan dengan lebar sidebar */}
                {/* Kartu Informasi HMJ - Mirip Admin */}
                <div className="bg-gradient-to-r from-rose-700 to-rose-900 text-white p-8 rounded-xl shadow-2xl mb-10"> {/* Diubah ke gradien maroon dan teks putih */}
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">HMJ Teknik Kimia</h1>
                    <p className="text-lg md:text-xl">Politeknik Negeri Sriwijaya</p>
                </div>

                {/* Statistik Kegiatan dan Berita */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10"> {/* Grid 2 kolom untuk 2 statistik */}
                    <DashboardCard
                        title="Total Berita"
                        value={totalBerita.toString()}
                        icon={<FiFileText className="text-rose-700" size={28} />} 
                        bgColor="bg-white" 
                        borderColor="border-rose-700" 
                    />
                    <DashboardCard
                        title="Total Kegiatan"
                        value={totalKegiatan.toString()}
                        icon={<FiActivity className="text-rose-700" size={28} />} 
                        bgColor="bg-white" 
                        borderColor="border-rose-700" 
                    />
                </div>
            </main>
        </div>
    );
}

// Komponen Kartu Dashboard Sederhana
interface DashboardCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    bgColor?: string;
    borderColor?: string; // Tambahkan prop borderColor
}

function DashboardCard({ title, value, icon, bgColor = "bg-card", borderColor = "border-border" }: DashboardCardProps) { // Default menggunakan warna theme
    return (
        <div className={`p-6 rounded-xl shadow-lg flex items-center space-x-6 transition-all duration-300 transform hover:scale-105 ${bgColor} border-l-4 ${borderColor}`}> {/* Menambahkan border kiri */}
            <div className="p-4 bg-white rounded-full shadow-md">
                {icon}
            </div>
            <div>
                <p className="text-md text-gray-700 font-semibold">{title}</p> {/* Diubah ke warna teks gelap */}
                <p className="text-3xl font-bold text-gray-800">{value}</p> {/* Diubah ke warna teks gelap */}
            </div>
        </div>
    );
}