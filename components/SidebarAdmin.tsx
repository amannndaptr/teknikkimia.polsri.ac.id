"use client";

import { useState, useEffect } from "react";
import { 
  FiLogOut, FiEdit, FiFileText, FiSettings, FiMessageSquare, 
  FiChevronDown, FiChevronRight, FiUsers, FiInfo, FiClipboard, 
  FiCheckSquare, FiPlusSquare, FiList, FiHome, FiBriefcase, 
  FiBookOpen, FiCalendar, FiAward, FiActivity, FiGlobe 
} from "react-icons/fi";
import { useRouter, usePathname } from "next/navigation";
import { signOutAction } from "@/app/actions";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { GraduationCap } from "lucide-react";

interface SidebarButtonProps {
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
  isExpanded?: boolean;
}

export default function SidebarAdmin() {
  const router = useRouter();
  const pathname = usePathname();
  const [isManajemenUserOpen, setIsManajemenUserOpen] = useState(false);
  const [isKuesionerOpen, setIsKuesionerOpen] = useState(false);

  // States for CMS sub-menus
  const [isCMSOpen, setIsCMSOpen] = useState(false);
  const [isCMSHomeOpen, setIsCMSHomeOpen] = useState(false);
  const [isCMSProfilOpen, setIsCMSProfilOpen] = useState(false);
  const [isCMSInformasiOpen, setIsCMSInformasiOpen] = useState(false);

  // Effect to open parent menus based on the current pathname
  useEffect(() => {
    // Determine which parent menu should be open based on the current path
    const isManajemenUserChildActive = pathname.startsWith('/pages-admin/data-management/mahasiswa') || 
                                       pathname.startsWith('/pages-admin/data-management/dosen');
    setIsManajemenUserOpen(isManajemenUserChildActive);

    const isKuesionerChildActive = pathname.startsWith('/pages-admin/kuesioner/baru') || 
                                   pathname.startsWith('/pages-admin/kuesioner');
    setIsKuesionerOpen(isKuesionerChildActive);

    // Check CMS parent and sub-parents
    const isCMSChildActive = pathname.startsWith('/pages-admin/cms');
    setIsCMSOpen(isCMSChildActive);

    // Check CMS sub-children (only if CMS parent is active)
    if (isCMSChildActive) {
        setIsCMSHomeOpen(pathname.startsWith('/pages-admin/cms/home'));
        setIsCMSProfilOpen(pathname.startsWith('/pages-admin/cms/profil'));
        setIsCMSInformasiOpen(pathname.startsWith('/pages-admin/cms/info'));
    } else {
        // If CMS parent is not active, ensure all its sub-menus are closed
        setIsCMSHomeOpen(false);
        setIsCMSProfilOpen(false);
        setIsCMSInformasiOpen(false);
    }
  }, [pathname]); // Re-run effect when pathname changes

  async function handleLogout() {
    await signOutAction();
  }

  // Function to close all menus
  const closeAllMenus = () => {
    setIsManajemenUserOpen(false);
    setIsKuesionerOpen(false);
    setIsCMSOpen(false);
    setIsCMSHomeOpen(false);
    setIsCMSProfilOpen(false);
    setIsCMSInformasiOpen(false);
  };

  return (
    <aside className="w-72 h-screen bg-gradient-to-b from-[#B2DFDB] to-[#80CBC4] text-gray-300 flex flex-col px-6 py-8 shadow-2xl fixed top-0 left-0 overflow-y-auto z-40 custom-scrollbar">
      {/* Efek Blur Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#B2DFDB] to-[#80CBC4] opacity-95 backdrop-blur-lg z-0"></div>

      <div className="flex items-center mb-6 z-10">
        {/* Foto Profil */}
        <div className="flex-shrink-0">
          <img
            src="/admin.png"
            alt="Profile"
            className="w-16 h-16 rounded-full object-cover border-4 border-teal-500 shadow-md"
          />
        </div>
        {/* Teks Judul Sidebar */}
        <h2 className="text-xl font-bold text-white tracking-wide ml-4">Admin</h2>
      </div>

      <nav className="flex-1 flex flex-col gap-3 z-10">
        <SidebarButton
          icon={<FiMessageSquare />}
          label="Dashboard"
          onClick={() => {
            closeAllMenus();
            router.push("/pages-admin");
          }}
          isActive={pathname === "/pages-admin"}
        />
        
        {/* Manajemen User section */}
        <SidebarButton
          icon={<FiUsers />}
          label={
            <div className="flex justify-between items-center w-full">
              <span>Manajemen User</span>
              {isManajemenUserOpen ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
            </div>
          }
          onClick={() => {
            const newOpenState = !isManajemenUserOpen;
            setIsManajemenUserOpen(newOpenState);
            setIsKuesionerOpen(false);
            setIsCMSOpen(false);
            setIsCMSHomeOpen(false);
            setIsCMSProfilOpen(false);
            setIsCMSInformasiOpen(false);
          }}
          isExpanded={isManajemenUserOpen}
        />
        
        {isManajemenUserOpen && (
          <div className="pl-6 mt-1 space-y-1">
            <SidebarButton
              icon={<FiUsers size={20} className="text-white/80" />}
              label="Dosen/Tendik"
              onClick={() => router.push('/pages-admin/data-management/dosen')} // Path ke halaman list dosen
              isActive={pathname.startsWith('/pages-admin/data-management/dosen')} // Aktif jika path dimulai dengan ini
            />
            <SidebarButton
              icon={<GraduationCap size={20} className="text-white/80" />}
              label="Mahasiswa"
              onClick={() => router.push('/pages-admin/data-management/mahasiswa')} // Path ke halaman list mahasiswa
              isActive={pathname.startsWith('/pages-admin/data-management/mahasiswa')} // Aktif jika path dimulai dengan ini
            />
            <SidebarButton
              icon={<UserGroupIcon className="h-5 w-5 text-white/80" />}
              label="Alumni"
              onClick={() => router.push('/pages-admin/data-management/alumni')} // Path ke halaman list alumni
              isActive={pathname.startsWith('/pages-admin/data-management/alumni')}  // Aktif jika path dimulai dengan ini
            />
          </div>
        )}

        {/* Layanan Mahasiswa section */}
        <SidebarButton
          icon={<FiMessageSquare />}
          label="Layanan Mahasiswa"
          onClick={() => {
            closeAllMenus();
            router.push('/pages-admin/pengaduan_aspirasi');
          }}
          isActive={pathname.startsWith('/pages-admin/pengaduan_aspirasi')}
        />

        {/* Kuesioner Dosen section */}
        <SidebarButton
          icon={<FiFileText />}
          label={
            <div className="flex justify-between items-center w-full">
              <span>Kuesioner Dosen</span>
              {isKuesionerOpen ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
            </div>
          }
          onClick={() => {
            const newOpenState = !isKuesionerOpen;
            setIsKuesionerOpen(newOpenState);
            setIsManajemenUserOpen(false);
            setIsCMSOpen(false);
            setIsCMSHomeOpen(false);
            setIsCMSProfilOpen(false);
            setIsCMSInformasiOpen(false);
          }}
          isExpanded={isKuesionerOpen}
        />
        
        {isKuesionerOpen && (
          <div className="pl-6 mt-1 space-y-1">
            <SidebarButton
              icon={<FiPlusSquare size={20} className="text-white/80" />}
              label="Buat Kuesioner"
              onClick={() => router.push('/pages-admin/kuesioner/baru')}
              isActive={pathname === '/pages-admin/kuesioner/baru'}
            />
            <SidebarButton
              icon={<FiList size={20} className="text-white/80" />}
              label="Daftar Kuesioner"
              onClick={() => router.push('/pages-admin/kuesioner')} // Path ke halaman daftar kuesioner
              isActive={pathname.startsWith('/pages-admin/kuesioner') && !pathname.includes('/baru')} // Aktif jika path adalah list atau sub-pathnya, tapi bukan '/baru'
            />
          </div>
        )}

        {/* Manajemen Konten section */}
        <SidebarButton
          icon={<FiSettings />}
          label={
            <div className="flex justify-between items-center w-full">
              <span>Manajemen Konten</span>
              {isCMSOpen ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
            </div>
          }
          onClick={() => {
            const newOpenState = !isCMSOpen;
            setIsCMSOpen(newOpenState);
            setIsManajemenUserOpen(false);
            setIsKuesionerOpen(false);
            if (!newOpenState) {
              setIsCMSHomeOpen(false);
              setIsCMSProfilOpen(false);
              setIsCMSInformasiOpen(false);
            }
          }}
          isExpanded={isCMSOpen}
        />
        
        {isCMSOpen && (
          <div className="pl-6 mt-1 space-y-1">
            {/* Sub-menu Home */}
            <SidebarButton
              icon={<FiHome size={20} className="text-white/80" />}
              label={
                <div className="flex justify-between items-center w-full">
                  <span>Home</span>
                  {isCMSHomeOpen ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
                </div>
              }
              onClick={() => {
                const newOpenState = !isCMSHomeOpen;
                setIsCMSHomeOpen(newOpenState);
                setIsCMSProfilOpen(false);
                setIsCMSInformasiOpen(false);
              }}
              isExpanded={isCMSHomeOpen}
            />
            
            {isCMSHomeOpen && (
              <div className="pl-8 mt-1 space-y-1">
                <SidebarButton 
                  icon={<FiUsers size={18} className="text-white/70" />} 
                  label="Mahasiswa per Prodi"
                  onClick={() => router.push("/pages-admin/cms/home/mhs-per-prodi")}
                  isActive={pathname.startsWith("/pages-admin/cms/home/mhs-per-prodi")}
                />
              </div>
            )}

            {/* Sub-menu Profil */}
            <SidebarButton
              icon={<FiBriefcase size={20} className="text-white/80" />}
              label={
                <div className="flex justify-between items-center w-full">
                  <span>Profil</span>
                  {isCMSProfilOpen ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
                </div>
              }
              onClick={() => {
                const newOpenState = !isCMSProfilOpen;
                setIsCMSProfilOpen(newOpenState);
                setIsCMSHomeOpen(false);
                setIsCMSInformasiOpen(false);
              }}
              isExpanded={isCMSProfilOpen}
            />
            
            {isCMSProfilOpen && (
              <div className="pl-8 mt-1 space-y-1">
                <SidebarButton 
                  icon={<FiFileText size={18} className="text-white/70" />} 
                  label="Sejarah"
                  onClick={() => router.push("/pages-admin/cms/profil/sejarah")}
                  isActive={pathname.startsWith("/pages-admin/cms/profil/sejarah")}
                />
                <SidebarButton 
                  icon={<FiFileText size={18} className="text-white/70" />} 
                  label="Visi & Misi"
                  onClick={() => router.push("/pages-admin/cms/profil/visi-misi")}
                  isActive={pathname.startsWith("/pages-admin/cms/profil/visi-misi")}
                />
                <SidebarButton 
                  icon={<FiUsers size={18} className="text-white/70" />} 
                  label="Struktur Organisasi"
                  onClick={() => router.push("/pages-admin/cms/profil/struktur-organisasi")}
                  isActive={pathname.startsWith("/pages-admin/cms/profil/struktur-organisasi")}
                />
              </div>
            )}

            {/* Program Studi */}
            <SidebarButton 
              icon={<FiBookOpen size={20} className="text-white/80" />}
              label="Program Studi"
              onClick={() => router.push("/pages-admin/cms/prodi")}
              isActive={pathname.startsWith("/pages-admin/cms/prodi")}
            />

            {/* Laboratorium */}
            <SidebarButton 
              icon={<FiClipboard size={20} className="text-white/80" />}
              label="Laboratorium"
              onClick={() => router.push("/pages-admin/cms/lab-content")}
              isActive={pathname.startsWith("/pages-admin/cms/lab-content")}
            />

            {/* Sub-menu Informasi */}
            <SidebarButton
              icon={<FiInfo size={20} className="text-white/80" />}
              label={
                <div className="flex justify-between items-center w-full">
                  <span>Informasi</span>
                  {isCMSInformasiOpen ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
                </div>
              }
              onClick={() => {
                const newOpenState = !isCMSInformasiOpen;
                setIsCMSInformasiOpen(newOpenState);
                setIsCMSHomeOpen(false);
                setIsCMSProfilOpen(false);
              }}
              isExpanded={isCMSInformasiOpen}
            />
            
            {isCMSInformasiOpen && (
              <div className="pl-8 mt-1 space-y-1">
                <SidebarButton 
                  icon={<FiAward size={18} className="text-white/70" />} 
                  label="Beasiswa"
                  onClick={() => router.push("/pages-admin/cms/info/beasiswa")}
                  isActive={pathname.startsWith("/pages-admin/cms/info/beasiswa")}
                />
                <SidebarButton 
                  icon={<FiGlobe size={18} className="text-white/70" />} 
                  label="Berita"
                  onClick={() => router.push("/pages-admin/cms/info/posts")}
                  isActive={pathname.startsWith("/pages-admin/cms/info/posts")}
                />
                <SidebarButton 
                  icon={<FiCalendar size={18} className="text-white/70" />} 
                  label="Kalender Akademik"
                  onClick={() => router.push("/pages-admin/cms/info/kalender")}
                  isActive={pathname.startsWith("/pages-admin/cms/info/kalender")}
                />
                <SidebarButton 
                  icon={<FiActivity size={18} className="text-white/70" />} 
                  label="Kegiatan"
                  onClick={() => router.push("/pages-admin/cms/info/kegiatan")}
                  isActive={pathname.startsWith("/pages-admin/cms/info/kegiatan")}
                />
              </div>
            )}
          </div>
        )}
      </nav>

      <button
        onClick={handleLogout}
        className="mt-auto flex items-center justify-center gap-3 bg-gradient-to-r from-[#80CBC4] to-[#B2DFDB] hover:from-[#B2DFDB] hover:to-[#80CBC4] text-white py-3 px-6 rounded-full shadow-lg transition-all duration-300 font-semibold text-base z-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400 group"
      >
        <FiLogOut className="text-xl group-hover:opacity-50 transition-opacity duration-300" />
        <span className="group-hover:opacity-50 transition-opacity duration-300">Logout</span>
      </button>
    </aside>
  );
}

function SidebarButton({ icon, label, onClick, isActive, isExpanded }: SidebarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-4 py-3 px-5 w-full text-left transition-all duration-300 rounded-2xl relative overflow-hidden z-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400 
        ${isActive ? 'bg-white/20' : isExpanded ? 'bg-white/10' : 'hover:bg-white/10'}`}
    >
      <span className={`text-xl ${isActive || isExpanded ? 'text-yellow-400' : 'text-teal-600'} group-hover:text-yellow-500 transition-transform duration-300 group-hover:scale-110`}>
        {icon}
      </span>
      <span className={`text-base font-medium text-white ${isActive || isExpanded ? 'font-semibold' : ''} group-hover:text-gray-100 transition-colors duration-300`}>
        {label}
      </span>

      {/* glowing effect for active or expanded items */}
      <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-teal-400 to-teal-600 ${isActive || isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-all duration-300 rounded-r-full`}></div>
    </button>
  );
}