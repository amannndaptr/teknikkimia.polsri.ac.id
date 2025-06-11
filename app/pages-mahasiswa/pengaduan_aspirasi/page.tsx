"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import SidebarMahasiswa from "@/components/SidebarMahasiswa"; // Impor SidebarMahasiswa
import Link from "next/link"; // Import Link untuk navigasi

// Define TypeScript interfaces
interface Layanan { // Disederhanakan, hanya untuk data yang ditampilkan di riwayat
  id: number;
  jenis: "Pengaduan" | "Aspirasi";
  kategori: string;
  isi: string;
  status: "Belum Diproses" | "Diproses" | "Selesai" | "Ditolak"; // Tambahkan status Ditolak
  created_at?: string;
  tanggal_status?: string; // Tanggal status terakhir diubah admin
  id_mhs?: string;
  foto_bukti?: string | null;
}

type StatusType = 'idle' | 'success' | 'error' | 'info';
interface StatusMessage {
  status: StatusType;
  message: string;
}

export default function LayananMahasiswaPage() {
  const [daftarLayanan, setDaftarLayanan] = useState<Layanan[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<StatusMessage>({
    status: 'idle',
    message: ''
  });

  // Inisialisasi client Supabase hanya di sisi client
  const supabase = createClient();

  useEffect(() => {
    async function initialize() {
      const userId = await getCurrentUser();
      if (userId) {
        await fetchLayanan(userId);
      }
      setLoading(false);
    }

    initialize();
  }, []); // Dependency array kosong agar hanya berjalan sekali saat mount

  // Get current user ID from Supabase auth
  async function getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user.id);
        return user.id; // Return the user ID
      } else {
        setStatusMessage({
          status: 'error',
          message: 'Tidak ada pengguna yang terautentikasi. Silakan login terlebih dahulu.'
        });
        return null;
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      setStatusMessage({
        status: 'error',
        message: `Gagal mendapatkan informasi pengguna: ${error instanceof Error ? error.message : String(error)}`
      });
      return null;
    }
  }

  const fetchLayanan = async (userId = currentUser) => {
    if (!userId) return;

    try {
      setStatusMessage({ status: 'info', message: 'Memuat data layanan...' });

      const { data, error } = await supabase
        .from('layanan')
        .select('*')
        .eq('id_mhs', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDaftarLayanan(data || []);
      setStatusMessage({ status: 'idle', message: '' });
    } catch (error) {
      console.error('Error fetching layanan:', error);
      setStatusMessage({
        status: 'error',
        message: `Gagal memuat data layanan: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex min-h-screen theme-mahasiswa"> {/* Gunakan kelas tema mahasiswa */}
        {/* Sidebar bisa ditampilkan di sini jika diinginkan, atau hanya loading global */}
        <SidebarMahasiswa />
        <main className="flex-1 p-6 text-center bg-blue-50 ml-72">Memuat data...</main> {/* Tambahkan ml-72 */}      </div>
    );
  }

  // Show login prompt if no user
  if (!currentUser) {
    return (
      <div className="flex min-h-screen theme-mahasiswa"> {/* Pastikan theme-mahasiswa digunakan, bg-gray-100 dihapus */}
        <SidebarMahasiswa /> {/* Tampilkan sidebar saat pesan login */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 flex justify-center items-center bg-blue-50 ml-72"> {/* Tambahkan ml-72 */}
          <div className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow border border-blue-200"> {/* bg-card -> bg-white, border-border -> border-blue-200 */}
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 p-6 rounded-lg shadow-md"> {/* Styling disesuaikan */}
              <h2 className="text-lg font-semibold mb-2">Login Diperlukan</h2>
              <p>Anda harus login terlebih dahulu untuk mengakses layanan mahasiswa.</p>
              <Link href="/login" className="text-[#0D9488] hover:underline mt-2 inline-block">Login Sekarang</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Main content
  return (
    <div className="flex min-h-screen theme-mahasiswa"> {/* Gunakan kelas tema mahasiswa */}
      <SidebarMahasiswa />
      <main className="flex-1 p-4 sm:p-6 md:p-8 bg-blue-50 ml-72"> {/* Tambahkan ml-72 */}
        <div className="max-w-7xl mx-auto bg-white p-6 rounded-lg shadow border border-blue-200"> {/* bg-card -> bg-white, border-border -> border-blue-200 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h1 className="text-xl md:text-2xl font-semibold text-blue-700">Riwayat Pengaduan & Aspirasi</h1> {/* Diubah ke biru */}
          </div>

          {/* Status message display untuk fetch data */}
          {statusMessage.message && statusMessage.status !== 'idle' && !(statusMessage.status === 'error' && !currentUser) ? ( // Jangan tampilkan pesan error login awal di sini
              <div className={`p-3 rounded-md text-sm mb-6 ${statusMessage.status === 'success' ? 'bg-green-100 border border-green-200 text-green-700' :
                statusMessage.status === 'error' ? 'bg-red-100 border border-red-200 text-red-700' :
                  'bg-blue-100 border border-blue-200 text-blue-700'
                }`}>
                {statusMessage.message}
              </div>
          ) : null}

          {/* Layanan history section */}
          <div className="bg-white rounded-lg shadow-lg border border-blue-200 overflow-hidden"> {/* bg-card -> bg-white, border-border -> border-blue-200 */}
            <div className="flex justify-between items-center p-5 border-b border-blue-200"> {/* border-border -> border-blue-200 */}
              <h2 className="text-lg md:text-xl font-semibold text-blue-700">Daftar Layanan Anda</h2> {/* text-card-foreground -> text-blue-700 */}
            </div>

            <div> {/* Hapus overflow-x-auto */}
              <table className="min-w-full divide-y divide-blue-200">
                <thead className="bg-blue-100">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Tanggal Dibuat</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Jenis</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Kategori</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Isi</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Bukti</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Tanggal Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-blue-200">
                  {daftarLayanan.map((layanan, index) => (
                    <tr key={layanan.id} className={index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-left">
                      {layanan.created_at ? new Date(layanan.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}
                      </td><td className="px-6 py-4 whitespace-nowrap text-sm text-blue-800 font-medium text-left">{layanan.jenis}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-800 font-medium text-left">{layanan.kategori}</td>
                      <td className="px-6 py-4 text-sm text-blue-800 text-left" title={layanan.isi}>{layanan.isi}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-left">
                        {layanan.foto_bukti ? (
                          <a
                            href={layanan.foto_bukti}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 font-medium "
                          >
                            Lihat Bukti
                          </a>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td><td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${layanan.status === "Belum Diproses" ? "bg-yellow-100 text-yellow-800" :
                          layanan.status === "Diproses" ? "bg-blue-100 text-green-800" :
                            layanan.status === "Selesai" ? "bg-blue-300 text-black-800" :
                              layanan.status === "Ditolak" ? "bg-red-100 text-red-800" : 
                              "bg-gray-100 text-gray-800"
                          }`}>
                          {layanan.status}
                        </span></td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-left">
                        {(layanan.status === "Diproses" || layanan.status === "Selesai" || layanan.status === "Ditolak") && layanan.tanggal_status
                          ? new Date(layanan.tanggal_status).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </td></tr>
                  ))}
                  {daftarLayanan.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-gray-500 py-6 text-sm">
                        Belum ada layanan yang dikirim.
                      </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Notes */}
            <div className="p-5 border-t border-blue-200 bg-blue-50 text-xs text-blue-700">
              <p className="mb-2 font-semibold text-blue-800">Catatan Penting:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Layanan akan diproses oleh admin dalam waktu 1-3 hari kerja.</li>
                <li>Periksa status layanan Anda secara berkala.</li>
                <li>Untuk pertanyaan lebih lanjut, silakan hubungi bagian layanan mahasiswa.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
