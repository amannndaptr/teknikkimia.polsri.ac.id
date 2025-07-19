"use client";

import { FiLogOut, FiEdit, FiMessageSquare, FiSettings, FiChevronDown, FiChevronRight, FiPlusSquare, FiList } from "react-icons/fi"; // Tambahkan ikon
import { useRouter, usePathname } from "next/navigation"; // Import usePathname
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { signOutAction } from "@/app/actions";

interface MahasiswaData {
    id_mhs: string;
    nim: string;
    nama: string;
    kelas: string;
    jabatan_kelas: string;
    angkatan: string;
    prodi: string;
    foto_profil?: string;
}

interface SidebarButtonProps {
    icon: React.ReactNode;
    label: React.ReactNode;
    onClick: () => void;
    isActive?: boolean;
    isExpanded?: boolean; 
}

export default function SidebarMahasiswa() {
    const [user, setUser] = useState<MahasiswaData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLayananOpen, setIsLayananOpen] = useState(false); 
    const pathname = usePathname(); // Dapatkan pathname saat ini
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

                const { data: { session } } = await supabase.auth.getSession();
                const userRole = session?.user.user_metadata?.role;

                if (userRole !== "mahasiswa") {
                    router.push("/sign-in");
                    return;
                }

                const { data: mahasiswaData, error: mahasiswaError } = await supabase
                    .from('mahasiswa')
                    .select('*')
                    .eq('id_mhs', authUser.id)
                    .single();

                if (mahasiswaError || !mahasiswaData) {
                    console.error("Failed to fetch student data:", mahasiswaError?.message);
                    return;
                }

                setUser(mahasiswaData);
            } catch (error) {
                console.error("Error fetching student data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchUserData();
    }, [supabase]); // Hapus router dari dependency array jika tidak digunakan untuk memicu re-fetch

    // Effect untuk mengatur state dropdown berdasarkan pathname
    useEffect(() => {
        const isLayananChildActive = pathname.startsWith('/pages-mahasiswa/pengaduan_aspirasi');
        setIsLayananOpen(isLayananChildActive);
    }, [pathname]);

    if (loading) {
        return <div className="text-center mt-10 text-gray-500">Loading...</div>;
    }

    if (!user) {
        return (
            <div className="text-center mt-10 text-red-400">
                Unable to load student data. Please try again.
            </div>
        );
    }

    async function handleLogout() {
        await signOutAction();
    }

    return (
        <aside className="w-72 h-screen bg-gradient-to-b from-[#B3C7D6] to-[#D1D9E6] text-gray-900 flex flex-col px-6 py-8 shadow-2xl fixed top-0 left-0 overflow-y-auto z-40 custom-scrollbar"> {/* Tambahkan fixed, h-screen, overflow-y-auto, z-index, dan custom-scrollbar */}
            <div className="flex items-center mb-6">
                {/* Foto Profil */}
                <div className="flex-shrink-0">
                    <img
                        src={user.foto_profil || "/default-profile.png"}
                        alt="Profile"
                        className="w-16 h-16 rounded-full object-cover border-4 border-teal-400 shadow-md"
                    />
                </div>
                {/* Teks Judul Sidebar */}
                <h2 className="text-xl font-bold text-white tracking-wide ml-4">{user.nama}</h2>
            </div>

            <nav className="flex-1 flex flex-col gap-3"> {/* Tambahkan flex-1 agar tombol logout bisa ke bawah dengan mt-auto */}
                <SidebarButton
                    icon={<FiMessageSquare />}
                    label="Dashboard"
                    onClick={() => router.push("/pages-mahasiswa")}
                    isActive={pathname === "/pages-mahasiswa"}
                />
                
                <SidebarButton
                    icon={<FiMessageSquare />}
                    label={
                        <div className="flex justify-between items-center w-full">
                            <span>Layanan Mahasiswa</span>
                            {isLayananOpen ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
                        </div>
                    }
                    onClick={() => setIsLayananOpen(!isLayananOpen)}
                    isActive={pathname.startsWith("/pages-mahasiswa/pengaduan_aspirasi")}
                    isExpanded={isLayananOpen}
                />
                {isLayananOpen && (
                    <div className="pl-6 mt-1 space-y-1">
                        <SidebarButton
                            icon={<FiPlusSquare size={20} className="text-teal-500" />}
                            label="Buat Layanan Baru"
                            onClick={() => router.push("/pages-mahasiswa/pengaduan_aspirasi/buat")}
                            isActive={pathname === "/pages-mahasiswa/pengaduan_aspirasi/buat"}
                        />
                        <SidebarButton
                            icon={<FiList size={20} className="text-teal-500" />}
                            label="Riwayat Layanan"
                            onClick={() => router.push("/pages-mahasiswa/pengaduan_aspirasi")}
                            isActive={pathname === "/pages-mahasiswa/pengaduan_aspirasi"}
                        />
                    </div>
                )}
                <SidebarButton
                    icon={<FiEdit />}
                    label="Kuesioner Dosen"
                    onClick={() => router.push("/pages-mahasiswa/kuesioner")}
                    isActive={pathname === "/pages-mahasiswa/kuesioner"}
                />
                <SidebarButton
                    icon={<FiSettings />}
                    label="Settings"
                    onClick={() => router.push("/pages-mahasiswa/settings")}
                    isActive={pathname === "/pages-mahasiswa/settings"}
                />
            </nav>

            <button
                onClick={handleLogout}
                className="mt-auto flex items-center justify-center gap-3 bg-gradient-to-r from-[#A1C4FD] to-[#C2E9FB] hover:from-[#C2E9FB] hover:to-[#A1C4FD] text-white py-3 px-6 rounded-full shadow-lg transition-all duration-300 font-semibold text-base z-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400 group">  {/* Tambahkan mt-auto */}
                <FiLogOut className="text-xl group-hover:text-gray-500" />
                <span className="text-base font-medium text-white group-hover:text-gray-500">Logout</span>
            </button>
        </aside>
    );
}

// Sidebar Button Component
function SidebarButton({ icon, label, onClick, isActive, isExpanded }: SidebarButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`group flex items-center gap-4 py-3 px-5 w-full text-left transition-all duration-300 rounded-2xl relative overflow-hidden z-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400
                ${isActive ? 'bg-white/20' : isExpanded ? 'bg-white/10' : ''}`}
        >
            <span className={`text-xl ${isActive || isExpanded ? 'text-yellow-400' : 'text-teal-500'} transition-transform duration-300`}>
                {icon}
            </span>
            <span className={`text-base font-medium text-white ${isActive || isExpanded ? 'font-semibold' : ''} transition-colors duration-300`}>{label}</span>

            {/* glowing effect for active/expanded */}
            <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-teal-400 to-teal-600 ${isActive || isExpanded ? 'opacity-100' : 'opacity-0'} transition-all duration-300 rounded-r-full`}></div>
        </button>
    );
}
