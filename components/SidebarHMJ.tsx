"use client";

import { useState, useEffect } from "react";
import { FiLogOut, FiSettings, FiHome, FiCalendar, FiFileText } from "react-icons/fi"; // Hapus ikon dropdown yang tidak terpakai
import { useRouter, usePathname } from "next/navigation"; // Tambahkan usePathname
import { signOutAction } from "@/app/actions";
import { createClient } from "@/utils/supabase/client";

interface SidebarButtonProps {
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
  isActive?: boolean; // Tambahkan isActive
}

export default function SidebarHMJ() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname(); // Dapatkan pathname saat ini
  const supabase = createClient();

  useEffect(() => {
    async function fetchUser() {
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
          router.push("/sign-in");
          return;
        }

        setUserEmail(authUser.email || "HMJ User");
      } catch (error) {
        console.error("Error fetching HMJ user data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [router, supabase]);

  async function handleLogout() {
    await signOutAction();
  }

  if (loading) {
    return <div className="w-72 h-screen bg-gradient-to-b from-rose-800 to-rose-900 text-white flex items-center justify-center">Memuat...</div>;
  }

  return (
    <aside className="w-72 h-screen bg-gradient-to-b from-rose-900 to-rose-950 text-rose-200 flex flex-col px-6 py-8 shadow-2xl fixed top-0 left-0 overflow-y-auto z-40 custom-scrollbar">
      {/* Efek Blur Background */}
      <div className="absolute inset-0 backdrop-blur-lg z-0"></div>

      <div className="flex items-center mb-8 z-10">
        <div className="flex-shrink-0">
          <img
            src="/logopolsri.png" // Menggunakan path absolut
            alt="Logo HMJ"
            className="w-16 h-16 rounded-full object-cover border-4 border-yellow-400 shadow-md"
          />
        </div>
        <h2 className="text-xl font-bold text-yellow-300 tracking-wide ml-4">HMJ Teknik Kimia</h2>
      </div>

      <nav className="flex-1 flex flex-col gap-3 z-10">
        <SidebarButton
          icon={<FiHome />}
          label="Dashboard"
          onClick={() => router.push("/pages-hmj")} // Untuk Dashboard, path biasanya adalah root dari section
          isActive={pathname === "/pages-hmj" || pathname === "/pages-hmj/"}
        />

        {/* Menu Berita - Tanpa Dropdown */}
        <SidebarButton
          icon={<FiFileText />}
          label="Berita"
          onClick={() => router.push('/pages-hmj/posts')}
          isActive={pathname.startsWith('/pages-hmj/posts')} // Aktif jika path dimulai dengan ini
        />

        {/* Menu Kegiatan - Tanpa Dropdown */}
        <SidebarButton
          icon={<FiCalendar />}
          label="Kegiatan"
          onClick={() => router.push('/pages-hmj/kegiatan')}
          isActive={pathname.startsWith('/pages-hmj/kegiatan')} // Aktif jika path dimulai dengan ini
        />
      </nav>

      {/* Tombol Settings bisa ditambahkan di sini jika diperlukan */}
      {/* <SidebarButton icon={<FiSettings />} label="Settings" onClick={() => router.push('/pages-hmj/settings')} isActive={pathname === '/pages-hmj/settings'} /> */}

      <button
        onClick={handleLogout}
        className="mt-auto flex items-center justify-center gap-3 bg-gradient-to-r from-rose-700 to-rose-800 hover:from-rose-800 hover:to-rose-700 text-white py-3 px-6 rounded-full shadow-lg transition-all duration-300 font-semibold text-base z-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 group"
      >
        <FiLogOut className="text-xl group-hover:opacity-80 transition-opacity duration-300" />
        <span className="group-hover:opacity-80 transition-opacity duration-300">Logout</span>
      </button>
    </aside>
  );
}

function SidebarButton({ icon, label, onClick, isActive }: SidebarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-4 py-3 px-5 w-full text-left transition-all duration-300 rounded-2xl relative overflow-hidden z-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500
                  ${isActive ? 'bg-rose-800/90' : 'hover:bg-rose-800/70'}`}
    >
      <span className={`text-xl ${isActive ? 'text-yellow-300' : 'text-yellow-400'} group-hover:text-yellow-300 transition-transform duration-300 group-hover:scale-110`}>
        {icon}
      </span>
      <span className={`text-base font-medium ${isActive ? 'text-yellow-200 font-semibold' : 'text-rose-200'} group-hover:text-yellow-200 transition-colors duration-300`}>
        {label}
      </span>
      {/* Indikator aktif */}
      <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-yellow-400 to-yellow-500 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-all duration-300 rounded-r-full`}></div>
    </button>
  );
}