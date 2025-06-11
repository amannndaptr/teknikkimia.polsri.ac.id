'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquareText, User, LogOut, ChevronLeft, ChevronRight, Settings, Edit2Icon, EditIcon } from 'lucide-react'; // Tambahkan Settings jika perlu
import { useState, useEffect } from 'react'; // Tambahkan useEffect
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

// Interface untuk data alumni (sesuaikan dengan struktur tabel Anda)
interface AlumniData {
    id: string; // atau tipe data ID yang sesuai
    nama: string;
    foto?: string; // Opsional
}

const SidebarAlumni = () => {
    const pathname = usePathname();
    const router = useRouter();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [alumniUser, setAlumniUser] = useState<AlumniData | null>(null); // State untuk data alumni
    const [loading, setLoading] = useState(true); // State untuk loading
    const supabase = createClient();

    // useEffect untuk mengambil data alumni
    useEffect(() => {
        const fetchAlumniData = async () => {
            setLoading(true);
            const { data: { user: authUser } } = await supabase.auth.getUser();
            console.log("SidebarAlumni - Authenticated user (authUser):", authUser); // Log 1: Cek authUser

            if (authUser) {
                // Ganti 'alumni' dengan nama tabel alumni Anda
                // Ganti 'user_id' dengan nama kolom foreign key yang merujuk ke auth.users.id
                // Sesuaikan kolom 'id, nama, foto_profil'
                const { data, error } = await supabase
                .from('alumni') // <-- Apakah nama tabel ini benar?
                .select('id, nama, foto') // <-- Apakah nama kolom-kolom ini benar?
                .eq('user_id', authUser.id) // <-- Apakah 'user_id' adalah kolom foreign key yang benar?
                .single();

                console.log("SidebarAlumni - Fetched alumni data from DB (data):", data); // Log 2: Cek data yang diambil dari DB
                console.log("SidebarAlumni - Supabase query error (error):", error); // Log 3: Cek jika ada error dari query

                if (data) {
                    setAlumniUser(data as AlumniData);
                } else if (error) {
                    console.error("SidebarAlumni - Error fetching alumni data from Supabase:", error.message);
                }
            }
            setLoading(false);
        };
        fetchAlumniData();
    }, [supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/sign-in'); // Arahkan ke halaman login setelah logout
    };

    const navItems = [
        { href: '/pages-alumni/', label: 'Dashboard', icon: MessageSquareText },
        { href: '/pages-alumni/testimoni-alumni', label: 'Testimoni Saya', icon: EditIcon },
        // { href: '/pages-alumni/settings', label: 'Settings', icon: Settings }, // Contoh menu settings
    ];

    return (
        <aside className={`fixed top-0 left-0 z-40 h-screen bg-gradient-to-b from-[#B3C7D6] to-[#D1D9E6] text-gray-900 flex flex-col shadow-2xl transition-all duration-300 ease-in-out custom-scrollbar ${isCollapsed ? 'w-20 px-2 py-4' : 'w-72 px-6 py-8'}`}>
            <div className="flex flex-col h-full">
                {/* Header dengan Nama */}
                <div className={`flex items-center ${isCollapsed ? 'justify-center mb-6' : 'mb-3'}`}> {/* Kurangi mb-6 menjadi mb-3 saat tidak collapsed */}
                    {!isCollapsed && (                        
                           <h2 className="text-xl font-bold text-white tracking-wide ml-4">{loading ? "Memuat..." : alumniUser?.nama || "Alumni"}</h2>                        
                    )} 
                </div>

                {/* Tombol Collapse/Expand */}
                <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-end'} ${!isCollapsed ? 'mb-2' : 'mb-2'}`}> {/* Ubah mb-4 menjadi mb-2 saat tidak collapsed */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-2 rounded-md text-gray-700 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {/* Ikon Chevron dihilangkan */}
                    </button>
                </div>

                <nav className={`flex-grow space-y-2 ${isCollapsed ? 'mt-6' : ''}`}>
                    {navItems.map((item) => {
                        // Logika untuk menentukan apakah item menu aktif
                        let isActive;
                        if (item.href === '/pages-alumni/') { // Logika khusus untuk Dashboard
                            // Aktif jika pathname adalah '/pages-alumni/' ATAU '/pages-alumni'
                            isActive = (pathname === '/pages-alumni/' || pathname === '/pages-alumni');
                        } else if (item.href === '/pages-alumni/testimoni-alumni') { // Logika untuk Testimoni Saya dan sub-halamannya
                            isActive = pathname.startsWith(item.href);
                        } else { // Fallback untuk item menu lain (jika ada di masa depan)
                            isActive = pathname === item.href;
                        }

                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={`group flex items-center gap-4 py-3 rounded-2xl w-full text-left transition-all duration-300 relative overflow-hidden
                                    ${isActive ? 'bg-white/20' : 'hover:bg-white/10'} 
                                    ${isCollapsed ? 'justify-center px-0' : 'px-5'}`}
                                title={item.label}
                            >
                                <span className={`text-xl ${isActive ? 'text-yellow-400' : 'text-teal-500'} group-hover:text-yellow-400 transition-transform duration-300 group-hover:scale-110 ${isCollapsed ? 'mx-auto' : ''}`}>
                                    <item.icon />
                                </span>
                                {!isCollapsed && (
                                    <span className={`text-base font-medium text-white ${isActive ? 'font-semibold' : ''} group-hover:text-gray-300 transition-colors duration-300`}>
                                        {item.label}
                                    </span>
                                )}
                                {!isCollapsed && (
                                    <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-teal-400 to-teal-600 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-all duration-300 rounded-r-full`}></div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto">
                    <button
                        onClick={handleLogout}
                        className={`group flex items-center w-full gap-3 py-3 rounded-full shadow-lg transition-all duration-300 font-semibold text-base focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400
                                    bg-gradient-to-r from-[#A1C4FD] to-[#C2E9FB] hover:from-[#C2E9FB] hover:to-[#A1C4FD] text-white
                                    ${isCollapsed ? 'justify-center px-0 py-4' : 'px-6 justify-center'}`}
                        title="Logout"
                    >
                        <LogOut className={`text-xl group-hover:text-gray-700 ${isCollapsed ? 'mx-auto' : ''}`} />
                        {!isCollapsed && <span className="text-base font-medium text-white group-hover:text-gray-700">Logout</span>}
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default SidebarAlumni;