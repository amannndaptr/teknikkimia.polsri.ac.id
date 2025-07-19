"use client";

import { FiLogOut, FiMessageSquare, FiFileText, FiEdit, FiSettings, FiChevronDown, FiChevronRight, FiUploadCloud, FiList } from "react-icons/fi"; // Menambah beberapa ikon yang relevan
import { useRouter, usePathname } from "next/navigation"; // Import usePathname
import { signOutAction } from "@/app/actions";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface SidebarButtonProps {
    icon: React.ReactNode;
    label: React.ReactNode; // Ubah tipe label agar bisa menerima JSX (untuk ikon chevron)
    onClick: () => void;
    isActive?: boolean; // Tambahkan prop isActive
    isExpanded?: boolean; // Tambahkan prop isExpanded
}

// Interface untuk data dosen yang dibutuhkan oleh Sidebar
interface DosenDisplayData {
    nama: string;
    foto?: string | null;
    // Anda bisa menambahkan field lain jika sidebar membutuhkannya di masa depan
}

// Hapus props `dosen` dan `photoVersion` karena sidebar akan mengambil datanya sendiri
export default function SidebarDosen() {
    const [dosenData, setDosenData] = useState<DosenDisplayData | null>(null);
    // State loading dihapus untuk menghindari jeda visual
    // const [loading, setLoading] = useState(true); 
    const [isPenelitianOpen, setIsPenelitianOpen] = useState(false); // State untuk dropdown Penelitian & Pengabdian
    const [photoVersionInternal, setPhotoVersionInternal] = useState(Date.now());
    const router = useRouter();
    const pathname = usePathname(); // Dapatkan pathname saat ini
    const supabase = createClient();

    useEffect(() => {
        let isMounted = true; // Flag untuk mencegah update state jika komponen sudah unmount

        const fetchDosenDataForSidebar = async () => { // Gunakan const untuk fungsi async
            try {
                const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
                if (!isMounted) return;

                if (authError || !authUser) {
                    // Jika tidak terautentikasi, ini adalah kondisi yang jelas untuk mengosongkan data.
                    console.warn("SidebarDosen: Pengguna tidak terautentikasi atau sesi berakhir.", authError?.message);
                    // Pertimbangkan untuk tidak redirect dari sidebar, biarkan halaman yang menangani
                    // router.push("/auth/login");
                    if (isMounted) setDosenData(null);
                    return; // Keluar dari fungsi jika tidak ada user
                }

                const { data, error: dosenError } = await supabase
                    .from("dosen")
                    .select("nama, foto") // Hanya ambil nama dan foto
                    .eq("id_dsn", authUser.id)
                    .single();

                if (!isMounted) return;

                if (dosenError) {
                    console.error("SidebarDosen: Gagal mengambil data dosen:", dosenError?.message);
                    // Jika terjadi error saat mengambil data dosen, JANGAN ubah dosenData jika sudah ada.
                    // Biarkan data lama (jika ada) tetap ditampilkan untuk menghindari kedipan.
                    // Jika dosenData memang masih null (misal, load awal), ia akan tetap null.
                } else if (!data) {
                    // Tidak ada error, tapi tidak ada data dosen yang ditemukan untuk user ini.
                    console.warn("SidebarDosen: Tidak ada data dosen ditemukan untuk pengguna yang terautentikasi.");
                    if (isMounted) setDosenData(null); // Ini kondisi yang jelas untuk mengosongkan data.
                } else { // Sukses: data ditemukan
                    setDosenData(data);
                    // Update versi foto hanya jika data berhasil diambil dan ada foto baru
                    if (data.foto) {
                         setPhotoVersionInternal(Date.now()); 
                    }
                }
            } catch (error: any) {
                if (!isMounted) return;
                console.error("SidebarDosen: Terjadi error tak terduga saat mengambil data dosen:", error.message);
                // Untuk error tak terduga, juga jangan ubah dosenData jika sudah ada.
                // Biarkan data lama (jika ada) tetap ditampilkan.
            }
        }; // Tutup fungsi async

        fetchDosenDataForSidebar();
        return () => {
            isMounted = false; // Set flag ke false saat komponen unmount
        };
    }, [supabase]); // Hanya supabase sebagai dependency, router biasanya stabil

    // Effect untuk mengatur state dropdown berdasarkan pathname
    useEffect(() => {
        const isPenelitianChildActive = pathname.startsWith('/pages-dosen/penelitian-pengabdian');
        setIsPenelitianOpen(isPenelitianChildActive);
    }, [pathname]);

    async function handleLogout() {
        await signOutAction();
        router.push("/auth/login");
    }

    const closeAllMenusAndNavigate = (path: string) => {
        setIsPenelitianOpen(false);
        router.push(path);
    };

    // Tidak ada lagi kondisi loading di sini, sidebar akan selalu render dengan data yang ada
    // if (loading && !dosenData) { 
    //     // ... skeleton loading jika diinginkan
    // }

    return (
        <aside className="w-72 min-h-screen bg-gradient-to-b from-[#B3C7D6] to-[#D1D9E6] text-gray-900 flex flex-col px-6 py-8 shadow-2xl relative overflow-hidden">
            {/* Efek Blur Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#d8e0f0] to-[#324870] blur-md z-0"></div>

            {/* Header dengan Foto Profil dan Teks */}
            <div className="flex items-center mb-6 z-10">
                {/* Foto Profil */}
                <div className="flex-shrink-0">
                <img
                    src={dosenData?.foto || "/default-profile.png"} // Langsung gunakan dosenData.foto jika itu Data URL
                    alt="Profile"
                    key={photoVersionInternal} // Gunakan photoVersionInternal sebagai key untuk membantu re-render jika foto berubah
                    className="w-16 h-16 rounded-full object-cover border-4 border-teal-900 shadow-md"
                />

                </div>
                {/* Teks Judul Sidebar */}
                {/* Langsung tampilkan nama jika ada, atau default */}
                <h2 className="text-xl font-bold text-white tracking-wide ml-4">{dosenData?.nama || "Nama Dosen"}</h2>
            </div>

            {/* Menu Navigasi */}
            <nav className="flex flex-col gap-3 z-10">
                <SidebarButton
                    icon={<FiMessageSquare />}
                    label="Dashboard"
                    onClick={() => closeAllMenusAndNavigate("/pages-dosen")}
                    isActive={pathname === "/pages-dosen"}
                />
                
                <SidebarButton
                    icon={<FiEdit />}
                    label="Evaluasi Kinerja"
                    onClick={() => closeAllMenusAndNavigate("/pages-dosen/evaluasi-hasil")}
                    isActive={pathname === "/pages-dosen/evaluasi-hasil"}
                />
                <SidebarButton
                    icon={<FiFileText />}
                    label={
                        <div className="flex justify-between items-center w-full">
                            <span>Penelitian & Pengabdian</span>
                            {isPenelitianOpen ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
                        </div>
                    }
                    onClick={() => {
                        setIsPenelitianOpen(!isPenelitianOpen);
                    }}
                    isExpanded={isPenelitianOpen}
                    isActive={pathname.startsWith('/pages-dosen/penelitian-pengabdian')}
                />
                {isPenelitianOpen && (
                    <div className="pl-6 mt-1 space-y-1">
                        <SidebarButton
                            icon={<FiUploadCloud size={20} className="text-teal-700" />}
                            label="Upload Dokumen"
                            onClick={() => router.push("/pages-dosen/penelitian-pengabdian/upload")}
                            isActive={pathname === "/pages-dosen/penelitian-pengabdian/upload"}
                        />
                        <SidebarButton
                            icon={<FiList size={20} className="text-teal-700" />}
                            label="Daftar Dokumen"
                            onClick={() => router.push("/pages-dosen/penelitian-pengabdian/daftar")}
                            isActive={pathname === "/pages-dosen/penelitian-pengabdian/daftar"}
                        />
                    </div>
                )}
                <SidebarButton
                    icon={<FiSettings />}
                    label="Settings"
                    onClick={() => closeAllMenusAndNavigate("/pages-dosen/settings")}
                    isActive={pathname === "/pages-dosen/settings"}
                />
            </nav>

            {/* Tombol Logout */}
            <button
                onClick={handleLogout}
                className="mt-4 flex items-center justify-center gap-3 bg-gradient-to-r from-[#d8e0f0] to-[#324870] hover:from-[#324870] hover:to-[#d8e0f0] text-white py-3 px-6 rounded-full shadow-lg transition-all duration-300 font-semibold text-base z-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400 group">
                <FiLogOut className="text-xl" />
                <span>Logout</span>
            </button>
        </aside>
    );
}

// Komponen tombol sidebar (tetap sama)
function SidebarButton({ icon, label, onClick, isActive, isExpanded }: SidebarButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`group flex items-center gap-4 py-3 px-5 w-full text-left transition-all duration-300 rounded-2xl relative overflow-hidden z-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400 
                ${isActive ? 'bg-white/20' : isExpanded ? 'bg-white/10' : 'hover:bg-white/10'}`}
        >
            <span className={`text-xl ${isActive || isExpanded ? 'text-yellow-500' : 'text-teal-900'} group-hover:text-yellow-500 transition-transform duration-300 group-hover:scale-110`}>
                {icon}
            </span>
            <span className={`text-base font-medium text-white ${isActive || isExpanded ? 'font-semibold' : ''} group-hover:text-gray-300 transition-colors duration-300`}>{label}</span>

            {/* glowing effect saat hover */}
            <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-teal-500 to-teal-700 ${isActive || isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-all duration-300 rounded-r-full`}></div>
        </button>
    );
}
