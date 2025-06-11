'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import SidebarAdmin from '@/components/SidebarAdmin'; // Import SidebarAdmin
import { MessageSquare, Search, Filter } from 'lucide-react'; // Import icons
import { createClient } from '@/utils/supabase/client';

interface User {
  nama?: string;
  prodi?: string;
}

interface Layanan {
  id: number;
  jenis: string;
  kategori: string;
  isi: string;
  status: string;
  created_at: string;
  id_mhs: string;
  foto_bukti: string | null;
  tanggal_status?: string; // Tambahkan ini
  user?: User;
}

export default function AdminPengaduanPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [layanan, setLayanan] = useState<Layanan[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [jenisFilter, setJenisFilter] = useState<string>('all'); // 'all', 'Pengaduan', 'Aspirasi'
  const [kategoriFilter, setKategoriFilter] = useState<string>('all');
  const [availableKategori, setAvailableKategori] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Initialize Supabase client
  const supabase = createClient();

  useEffect(() => {
    fetchAllLayanan();
  }, []);

  const fetchAllLayanan = async () => {
    try {
      setLoading(true);

      // Fetch layanan with user information (joining with auth.users for user data)
      const { data, error } = await supabase
        .from('layanan')
        .select(`
          *,
          user:id_mhs (
            nama,
            prodi
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Gagal mengambil data layanan: ${error.message}`);
      }

      setLayanan(data || []);
      if (data) {
        const uniqueKategori = Array.from(new Set(data.map(item => item.kategori).filter(Boolean)));
        setAvailableKategori(uniqueKategori.sort());
      }
    } catch (error) {
      console.error('Error fetching layanan:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal memuat data layanan');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    if (!confirm(`Yakin ingin mengubah status layanan menjadi "${newStatus}"?`)) {
      return;
    }

    try {
      setUpdatingId(id);

      const newTanggalStatus = new Date().toISOString();
      const { data, error } = await supabase
        .from('layanan')
        .update({ status: newStatus, tanggal_status: newTanggalStatus })
        .eq('id', id)
        .select();

      if (error) {
        throw new Error(`Gagal mengupdate status: ${error.message}`);
      }

      toast.success(`Status berhasil diubah menjadi "${newStatus}"`);

      // Update local state to reflect changes
      setLayanan((prevItems) =>
        prevItems.map((item) =>
          item.id === id ? { ...item, status: newStatus, tanggal_status: newTanggalStatus } : item
        )
      );
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal mengupdate status layanan');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter layanan based on status and search query
  const filteredLayanan = layanan.filter((item) => {
    // Status filter
    const statusMatch =
      filter === 'all' ||
      (filter === 'belum' && item.status === 'Belum Diproses') ||
      (filter === 'diproses' && item.status === 'Diproses') ||
      (filter === 'selesai' && item.status === 'Selesai') ||
      (filter === 'tidak' && item.status === 'Tidak Selesai');

    // Jenis filter
    const jenisMatch =
      jenisFilter === 'all' ||
      item.jenis === jenisFilter;

    // Kategori filter
    const kategoriMatch =
      kategoriFilter === 'all' ||
      item.kategori === kategoriFilter;

    // Search filter (case insensitive)
    const searchLower = searchQuery.toLowerCase();
    const searchMatch =
      searchQuery === '' ||
      item.isi.toLowerCase().includes(searchLower) ||
      item.jenis.toLowerCase().includes(searchLower) ||
      item.kategori.toLowerCase().includes(searchLower) ||
      (item.user?.nama && item.user.nama.toLowerCase().includes(searchLower)) ||
      (item.user?.prodi && item.user.prodi.toLowerCase().includes(searchLower));

    return statusMatch && jenisMatch && kategoriMatch && searchMatch;
  });

  if (loading) {
    return (
      <div className="min-h-screen theme-admin flex items-center justify-center bg-background">
        <SidebarAdmin />
        <main className="ml-72 flex-grow flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            Memuat data layanan pengaduan & aspirasi...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-admin">
      <SidebarAdmin />
      <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto">
        <div className="w-full max-w-7xl mx-auto"> {/* Max width bisa disesuaikan jika perlu */}
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-foreground flex items-center">
              <MessageSquare className="mr-3 w-6 h-6 text-primary" />
              Layanan Pengaduan & Aspirasi
            </h1>
          </header>

          {/* Filter and Search Bar */}
          <div className="mb-6 p-6 bg-card shadow-lg rounded-xl border border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div>
                <input
                  id="searchLayanan"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari layanan mahasiswa..."
                  className="w-full border border-input bg-background text-foreground rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  <Filter className="w-4 h-4 inline mr-1" /> Filter Layanan
                </label>
                <div className="flex space-x-2">
                  {['all', 'Pengaduan', 'Aspirasi'].map((jenis) => (
                    <button
                      key={jenis}
                      onClick={() => setJenisFilter(jenis)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                        ${jenisFilter === jenis
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }
                      `}
                    >
                      {jenis === 'all' ? 'Semua Layanan' : jenis}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* List of Layanan */}
          <div className="bg-card shadow-lg rounded-xl p-6 border border-border">
            <h2 className="text-xl font-semibold text-card-foreground mb-5">Daftar Layanan Pengaduan & Aspirasi</h2>
            
            {layanan.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Tidak ada data layanan</p>
              </div>
            ) : filteredLayanan.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Tidak ada data layanan yang sesuai dengan filter</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Jenis & Kategori</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Pengguna</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tanggal</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Isi Laporan</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Tindakan</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Bukti</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                {filteredLayanan.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/40">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                          <div className="font-semibold">{item.jenis}</div>
                          <div className="text-xs text-muted-foreground">{item.kategori}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                          <div>{item.user?.nama || <span className="italic text-muted-foreground">Anonim</span>}</div>
                          <div className="text-xs text-muted-foreground">{item.user?.prodi || <span className="italic text-muted-foreground">N/A</span>}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate(item.created_at)}</td>
                        <td className="px-4 py-4 text-sm text-foreground">
                          <p className="whitespace-pre-line max-w-xs truncate hover:max-w-md hover:whitespace-normal hover:overflow-visible" title={item.isi}>
                            {item.isi}
                          </p>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-center">
                          <div className="flex flex-col items-center space-y-2 md:flex-row md:space-y-0 md:space-x-2 md:justify-center">
                        {item.status === 'Belum Diproses' && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'Diproses')}
                            disabled={updatingId === item.id}
                            className="bg-blue-600 text-white py-1 px-2.5 rounded-md text-xs hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed min-w-[90px] text-center"
                          >
                            {updatingId === item.id ? 'Memproses...' : 'Proses Pengaduan'}
                          </button>
                        )}
                        {item.status === 'Diproses' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(item.id, 'Selesai')}
                              disabled={updatingId === item.id}
                              className="bg-green-600 text-white py-1 px-2.5 rounded-md text-xs hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed min-w-[90px] text-center"
                            >
                              {updatingId === item.id ? 'Memproses...' : 'Tandai Selesai'}
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(item.id, 'Tidak Selesai')}
                              disabled={updatingId === item.id}
                              className="bg-red-600 text-white py-1 px-2.5 rounded-md text-xs hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed min-w-[90px] text-center"
                            >
                              {updatingId === item.id ? 'Memproses...' : 'Tandai Tidak Selesai'}
                            </button>
                          </>
                        )}

                        {(item.status === 'Selesai' || item.status === 'Tidak Selesai') && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'Diproses')}
                            disabled={updatingId === item.id}
                            className="bg-yellow-500 text-black py-1 px-2.5 rounded-md text-xs hover:bg-yellow-600 disabled:bg-yellow-400 disabled:cursor-not-allowed min-w-[90px] text-center"
                          >
                            {updatingId === item.id ? 'Memproses...' : 'Kembalikan ke Diproses'}
                          </button>
                        )}
                      </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                          {item.foto_bukti ? (
                            <a
                              href={item.foto_bukti}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80 hover:underline"
                            >
                              Lihat Bukti
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                        <span
                          className={`inline-block py-1 px-2.5 rounded-md text-xs font-medium min-w-[90px] text-center
                            ${item.status === 'Belum Diproses' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300' :
                              item.status === 'Diproses' ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300' :
                                item.status === 'Selesai' ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300' :
                                  'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300'}`}
                        >
                          {item.status}
                        </span>
                        </td>
                      </tr>
                ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}