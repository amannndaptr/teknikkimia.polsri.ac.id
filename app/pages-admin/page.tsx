// /pages-admin/page.tsx 

"use client";
import React, { useEffect, useState, Suspense } from 'react'; // Tambahkan React dan Suspense
import { useSearchParams, useRouter } from 'next/navigation';
import SidebarAdmin from '@/components/SidebarAdmin';
import { createClient } from "@/utils/supabase/client";
import {
    ArrowDownTrayIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    QueueListIcon,
    UsersIcon,
    AcademicCapIcon,
    BriefcaseIcon,
    UserGroupIcon,
    NewspaperIcon,      // Untuk Berita
    CalendarDaysIcon,   // Untuk Kegiatan
    GiftIcon,            // Untuk Kompensasi
    // Tambahkan ikon baru jika diperlukan untuk status kompensasi
    ClockIcon,          // Untuk Pending Review 
    ShieldCheckIcon,     // Untuk Admin Verified
    // Tambahkan ikon baru untuk Kuesioner dan Beasiswa
    ClipboardDocumentListIcon, // Untuk Kuesioner
    CurrencyDollarIcon      // Untuk Beasiswa
} from '@heroicons/react/24/outline'; // Pastikan Loader2 diimpor jika digunakan di fallback
import { Loader2 } from 'lucide-react'; // Impor Loader2 untuk fallback Suspense

function DashboardAdminContent() { // Ubah nama komponen ini
    const searchParams = useSearchParams();
    const router = useRouter();
    const successMessage = searchParams.get('success');
    const [showAlert, setShowAlert] = useState(!!successMessage);
    const [totalLayanan, setTotalLayanan] = useState(0);
    const [layananDiproses, setLayananDiproses] = useState(0);
    const [layananMasuk, setLayananMasuk] = useState(0); // State baru untuk layanan masuk
    const [layananSelesai, setLayananSelesai] = useState(0);
    const [totalMahasiswa, setTotalMahasiswa] = useState(0);
    const [jumlahDosen, setJumlahDosen] = useState(0); 
    const [jumlahStaff, setJumlahStaff] = useState(0); // Changed from jumlahTendik
    const [jumlahAlumni, setJumlahAlumni] = useState(0); // State baru untuk jumlah alumni
    const [jumlahBerita, setJumlahBerita] = useState(0);
    const [jumlahKegiatan, setJumlahKegiatan] = useState(0);
    const [jumlahKompensasi, setJumlahKompensasi] = useState(0);
    const [kompensasiPendingReview, setKompensasiPendingReview] = useState(0);
    const [kompensasiAdminVerified, setKompensasiAdminVerified] = useState(0);
    const [jumlahKuesioner, setJumlahKuesioner] = useState(0);
    const [jumlahBeasiswa, setJumlahBeasiswa] = useState(0);
    const supabase = createClient();

    const staffRolesList = [
        "Administrasi", 
        "Teknisi", 
        "Pranata Lab Pendidikan (PLP)", 
        "Pramu Gedung"
    ];

    useEffect(() => {
        if (successMessage) {
            setShowAlert(true);

            // Optional: Auto-hide alert after 5 seconds
            const timer = setTimeout(() => {
                setShowAlert(false);

                // Remove the success parameter from URL
                const url = new URL(window.location.href);
                url.searchParams.delete('success');
                router.replace(url.pathname);
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [successMessage, router]);

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch all layanan data from Supabase
                const { data: layananData, error: layananError } = await supabase
                    .from("layanan")
                    .select("*");

                if (layananError) {
                    console.error("Gagal mengambil data layanan:", layananError.message);
                    return;
                }

                if (layananData) {
                    setTotalLayanan(layananData.length);
                    setLayananDiproses(layananData.filter(item => item.status === 'Diproses').length);
                    setLayananMasuk(layananData.filter(item => item.status === 'Belum Diproses').length); // Hitung layanan masuk
                    setLayananSelesai(layananData.filter(item => item.status === 'Selesai').length);
                }

                // Fetch mahasiswa count
                const { count: mahasiswaCount, error: mahasiswaError } = await supabase
                    .from("mahasiswa") // Changed from "users" to "mahasiswa"
                    .select("id_mhs", { count: 'exact', head: true }); // Assuming 'id_mhs' is a primary key

                if (mahasiswaError) console.error("Gagal mengambil data mahasiswa:", mahasiswaError.message);
                else if (mahasiswaCount !== null) setTotalMahasiswa(mahasiswaCount);

                // Fetch Dosen count (role = 'dosen')
                const { count: dosenCount, error: dosenError } = await supabase
                    .from("dosen") // Changed from "users" to "dosen"
                    .select("id_dsn", { count: 'exact', head: true }) 
                    .eq("role", "Dosen"); // Filter by role 'Dosen' (capitalized)

                if (dosenError) console.error("Gagal mengambil data dosen:", dosenError.message);
                else if (dosenCount !== null) setJumlahDosen(dosenCount);

                // Fetch Staff count (role is in staffRolesList)
                const { count: staffCount, error: staffError } = await supabase
                    .from("dosen")
                    .select("id_dsn", { count: 'exact', head: true })
                    .in("role", staffRolesList); 
                
                if (staffError) console.error("Gagal mengambil data staff:", staffError.message);
                else if (staffCount !== null) setJumlahStaff(staffCount);

                // Fetch Alumni count
                const { count: alumniCount, error: alumniError } = await supabase
                    .from("alumni") // Asumsi nama tabel adalah "alumni"
                    .select("id", { count: 'exact', head: true }); // Menggunakan 'id' sebagai primary key

                if (alumniError) console.error("Gagal mengambil data alumni:", alumniError.message);
                else if (alumniCount !== null) setJumlahAlumni(alumniCount);

                // Fetch Berita count
                const { count: beritaCount, error: beritaError } = await supabase
                    .from("berita") // Asumsi nama tabel adalah "berita"
                    .select("id", { count: 'exact', head: true }); // Menggunakan 'id' sebagai primary key
                if (beritaError) console.error("Gagal mengambil data berita:", beritaError.message);
                else if (beritaCount !== null) setJumlahBerita(beritaCount);

                // Fetch Kegiatan count
                const { count: kegiatanCount, error: kegiatanError } = await supabase
                    .from("kegiatan") // Asumsi nama tabel adalah "kegiatan"
                    .select("id", { count: 'exact', head: true }); // Menggunakan 'id' sebagai primary key
                if (kegiatanError) console.error("Gagal mengambil data kegiatan:", kegiatanError.message);
                else if (kegiatanCount !== null) setJumlahKegiatan(kegiatanCount);

                // Fetch Kompensasi count
                // Pastikan tabel 'kompensasi' dan kolom 'id' (atau yang sesuai) ada
                const { count: kompensasiCount, error: kompensasiError } = await supabase
                    .from("kompensasi") // Asumsi nama tabel adalah "kompensasi"
                    .select("id", { count: 'exact', head: true }); // Menggunakan 'id' sebagai primary key
                if (kompensasiError) console.error("Gagal mengambil data kompensasi:", kompensasiError.message);
                else if (kompensasiCount !== null) setJumlahKompensasi(kompensasiCount);

                // Fetch Kompensasi Pending Admin Review count
                const { count: pendingReviewCount, error: pendingReviewError } = await supabase
                    .from("kompensasi")
                    .select("id", { count: 'exact', head: true })
                    .eq("status", "pending_admin_review"); // Menggunakan kolom 'status'
                if (pendingReviewError) console.error("Gagal mengambil data kompensasi pending review:", pendingReviewError.message);
                else if (pendingReviewCount !== null) setKompensasiPendingReview(pendingReviewCount);

                // Fetch Kompensasi Admin Verified count
                const { count: adminVerifiedCount, error: adminVerifiedError } = await supabase
                    .from("kompensasi")
                    .select("id", { count: 'exact', head: true })
                    .eq("status", "admin_verified"); // Menggunakan kolom 'status'
                if (adminVerifiedError) console.error("Gagal mengambil data kompensasi admin verified:", adminVerifiedError.message);
                else if (adminVerifiedCount !== null) setKompensasiAdminVerified(adminVerifiedCount);

                // Fetch Kuesioner count
                const { count: kuesionerCount, error: kuesionerError } = await supabase
                    .from("kuesioner") // Asumsi nama tabel adalah "kuesioner"
                    .select("id", { count: 'exact', head: true }); // Menggunakan 'id' sebagai primary key
                if (kuesionerError) console.error("Gagal mengambil data kuesioner:", kuesionerError.message);
                else if (kuesionerCount !== null) setJumlahKuesioner(kuesionerCount);

                // Fetch Beasiswa count
                const { count: beasiswaCount, error: beasiswaError } = await supabase
                    .from("cms_beasiswa") // Menggunakan nama tabel "cms_beasiswa"
                    .select("id", { count: 'exact', head: true }); // Menggunakan 'id' sebagai primary key
                if (beasiswaError) console.error("Gagal mengambil data beasiswa:", beasiswaError.message);
                else if (beasiswaCount !== null) setJumlahBeasiswa(beasiswaCount);


            } catch (error) {
                console.error('Gagal mengambil data:', error);
            }
        }
    
        fetchData();
    }, [supabase]);
    

    return (
        <div className="min-h-screen theme-admin"> {/* Hapus flex dari sini */}
            <SidebarAdmin />

            <main className="ml-72 flex-1 px-6 md:px-10 pt-4 md:pt-6 pb-6 md:pb-10 w-[calc(100%-18rem)] min-h-screen overflow-y-auto bg-background"> {/* Diubah ke bg-background */}
                {/* Kartu Informasi Admin */}
                <div className="mb-8 p-6 bg-gradient-to-r from-sky-600 to-cyan-500 text-white rounded-2xl shadow-xl">
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard Administrator</h1>
                    <p className="mt-2 text-lg opacity-90">Jurusan Teknik Kimia Politeknik Negeri Sriwijaya</p>
                </div>

                {/* <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
                <p className="text-gray-700 mb-6">Welcome to the admin dashboard!</p> */}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Mahasiswa */}
                    <div className="bg-white rounded-lg shadow-md p-3 flex items-center space-x-2 transform hover:scale-103 transition-transform duration-300 border-l-4 border-purple-500">
                        <div className="flex-shrink-0 p-1.5 rounded-full bg-purple-100">
                            <AcademicCapIcon className="h-6 w-6 text-purple-600" /> {/* Diubah dari UsersIcon */}
                        </div>
                        <div>
                            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Mahasiswa</h2>
                            <p className="text-lg sm:text-xl font-bold text-gray-900">{totalMahasiswa}</p>
                        </div>
                    </div>
                    {/* Jumlah Dosen */}
                    <div className="bg-white rounded-lg shadow-md p-3 flex items-center space-x-2 transform hover:scale-103 transition-transform duration-300 border-l-4 border-rose-500">
                        <div className="flex-shrink-0 p-1.5 rounded-full bg-rose-100">
                            <UsersIcon className="h-6 w-6 text-rose-600" /> {/* Diubah dari AcademicCapIcon */}
                        </div>
                        <div>
                            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Dosen</h2>
                            <p className="text-lg sm:text-xl font-bold text-gray-900">{jumlahDosen}</p>
                        </div>
                    </div>
                    {/* Jumlah Staff */}
                    <div className="bg-white rounded-lg shadow-md p-3 flex items-center space-x-2 transform hover:scale-103 transition-transform duration-300 border-l-4 border-teal-500">
                        <div className="flex-shrink-0 p-1.5 rounded-full bg-teal-100">
                            <BriefcaseIcon className="h-6 w-6 text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tenaga Kependidikan</h2>
                            <p className="text-lg sm:text-xl font-bold text-gray-900">{jumlahStaff}</p>
                        </div>
                    </div>
                    {/* Jumlah Alumni */}
                    <div className="bg-white rounded-lg shadow-md p-3 flex items-center space-x-2 transform hover:scale-103 transition-transform duration-300 border-l-4 border-indigo-500">
                        <div className="flex-shrink-0 p-1.5 rounded-full bg-indigo-100">
                            <UserGroupIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Alumni</h2>
                            <p className="text-lg sm:text-xl font-bold text-gray-900">{jumlahAlumni}</p>
                        </div>
                    </div>

                    {/* Jumlah Kuesioner */}
                    <div className="bg-white rounded-lg shadow-md p-3 flex items-center space-x-2 transform hover:scale-103 transition-transform duration-300 border-l-4 border-sky-500">
                        <div className="flex-shrink-0 p-1.5 rounded-full bg-sky-100">
                            <ClipboardDocumentListIcon className="h-6 w-6 text-sky-600" />
                        </div>
                        <div>
                            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Kuesioner Dosen</h2>
                            <p className="text-lg sm:text-xl font-bold text-gray-900">{jumlahKuesioner}</p>
                        </div>
                    </div>
                    

                    {/* Layanan Masuk */}
                    <div className="bg-white rounded-lg shadow-md p-3 flex items-center space-x-2 transform hover:scale-103 transition-transform duration-300 border-l-4 border-orange-500">
                        <div className="flex-shrink-0 p-1.5 rounded-full bg-orange-100">
                            <ArrowDownTrayIcon className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Layanan Masuk</h2>
                            <p className="text-lg sm:text-xl font-bold text-gray-900">{layananMasuk}</p>
                        </div>
                    </div>
                    {/* Layanan Diproses */}
                    <div className="bg-white rounded-lg shadow-md p-3 flex items-center space-x-2 transform hover:scale-103 transition-transform duration-300 border-l-4 border-amber-500">
                        <div className="flex-shrink-0 p-1.5 rounded-full bg-amber-100">
                            <ArrowPathIcon className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Layanan Diproses</h2>
                            <p className="text-lg sm:text-xl font-bold text-gray-900">{layananDiproses}</p>
                        </div>
                    </div>
                    {/* Layanan Selesai */}
                    <div className="bg-white rounded-lg shadow-md p-3 flex items-center space-x-2 transform hover:scale-103 transition-transform duration-300 border-l-4 border-green-500">
                        <div className="flex-shrink-0 p-1.5 rounded-full bg-green-100">
                            <CheckCircleIcon className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Layanan Selesai</h2>
                            <p className="text-lg sm:text-xl font-bold text-gray-900">{layananSelesai}</p>
                        </div>
                    </div>
                    {/* Total Layanan */}
                    <div className="bg-white rounded-lg shadow-md p-3 flex items-center space-x-2 transform hover:scale-103 transition-transform duration-300 border-l-4 border-blue-500">
                        <div className="flex-shrink-0 p-1.5 rounded-full bg-blue-100">
                            <QueueListIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Layanan</h2>
                            <p className="text-lg sm:text-xl font-bold text-gray-900">{totalLayanan}</p>
                            </div>
                        </div>
                    {/* Jumlah Beasiswa */}
                    <div className="bg-white rounded-lg shadow-md p-3 flex items-center space-x-2 transform hover:scale-103 transition-transform duration-300 border-l-4 border-pink-500">
                        <div className="flex-shrink-0 p-1.5 rounded-full bg-pink-100">
                            <CurrencyDollarIcon className="h-6 w-6 text-pink-600" />
                        </div>
                        <div>
                            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Beasiswa</h2>
                            <p className="text-lg sm:text-xl font-bold text-gray-900">{jumlahBeasiswa}</p>
                        </div>
                    </div>
                    {/* Jumlah Berita */}
                    <div className="bg-white rounded-lg shadow-md p-3 flex items-center space-x-2 transform hover:scale-103 transition-transform duration-300 border-l-4 border-cyan-500">
                        <div className="flex-shrink-0 p-1.5 rounded-full bg-cyan-100">
                            <NewspaperIcon className="h-6 w-6 text-cyan-600" />
                        </div>
                        <div>
                            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Berita</h2>
                            <p className="text-lg sm:text-xl font-bold text-gray-900">{jumlahBerita}</p>
                        </div>
                    </div>
                    
                    {/* Jumlah Kegiatan */}
                    <div className="bg-white rounded-lg shadow-md p-3 flex items-center space-x-2 transform hover:scale-103 transition-transform duration-300 border-l-4 border-lime-500">
                        <div className="flex-shrink-0 p-1.5 rounded-full bg-lime-100">
                            <CalendarDaysIcon className="h-6 w-6 text-lime-600" />
                        </div>
                        <div>
                            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Kegiatan</h2>
                            <p className="text-lg sm:text-xl font-bold text-gray-900">{jumlahKegiatan}</p>
                        </div>
                    </div>




                </div>

                {showAlert && (
                    <div className="fixed top-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md z-50">
                        <div className="flex">
                            <div className="py-1">
                                <svg className="fill-current h-6 w-6 text-green-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-bold">Login Successful</p>
                                <p className="text-sm">{successMessage}</p>
                            </div>
                            <div className="ml-auto">
                                <button onClick={() => setShowAlert(false)} className="text-green-700 hover:text-green-900">
                                    &times;
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

// Komponen Halaman Utama yang akan diekspor
export default function DashboardAdminPage() {
    return (
        // Bungkus komponen yang menggunakan useSearchParams dengan Suspense
        // Pastikan fallback UI cukup informatif dan ringan
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /> <span className="ml-2">Memuat dashboard...</span></div>}>
            <DashboardAdminContent />
        </Suspense>
    );
}