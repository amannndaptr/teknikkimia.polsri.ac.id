"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation"; // Impor useRouter
import Link from "next/link";
import SidebarMahasiswa from "@/components/SidebarMahasiswa"; // Impor SidebarMahasiswa

// Define TypeScript interfaces
interface FormData {
  jenis: "Pengaduan" | "Aspirasi" | ""; // Tambahkan string kosong untuk pilihan awal
  kategori: string;
  isi: string;
  bukti?: File | null;
}

interface Layanan extends Omit<FormData, 'bukti'> {
  // Interface ini mungkin tidak sepenuhnya dibutuhkan di sini,
  // tapi bisa berguna untuk konsistensi tipe saat membuat objek `layananBaru`
  id?: number; // id akan di-generate oleh DB
  status?: "Belum Diproses" | "Sedang Diproses" | "Selesai";
  created_at?: string;
  id_mhs?: string;
  foto_bukti?: string | null;
}

type StatusType = 'idle' | 'success' | 'error' | 'info';
interface StatusMessage {
  status: StatusType;
  message: string;
}

const KATEGORI_OPTIONS = {
  Pengaduan: [
    "Fasilitas",
    "Administrasi",
    "Akademik",
    "Layanan Digital",
    "Perpustakaan",
    "Keamanan Kampus",
    "Lainnya"
  ],
  Aspirasi: [
    "Kemahasiswaan",
    "Kegiatan Pembelajaran",
    "Kurikulum",
    "Ekstrakurikuler",
    "Penelitian",
    "Pengembangan Kampus",
    "Lainnya"
  ]
};

export default function BuatLayananPage() {
  const [formData, setFormData] = useState<FormData>({
    jenis: "", // Inisialisasi jenis sebagai string kosong
    kategori: "", // Inisialisasi kategori sebagai string kosong
    isi: "",
    bukti: null,
  });
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage>({
    status: 'idle',
    message: ''
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const [loadingUser, setLoadingUser] = useState(true);
  const router = useRouter(); // Inisialisasi router

  useEffect(() => {
    async function fetchUser() {
      setLoadingUser(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user.id);
      } else {
        // Pengguna tidak login, mungkin arahkan atau tampilkan pesan
        setStatusMessage({
          status: 'error',
          message: 'Anda harus login untuk membuat layanan. Silakan login terlebih dahulu.'
        });
      }
      setLoadingUser(false);
    }
    fetchUser();

    // Cleanup preview URL on unmount
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [supabase.auth, previewUrl]); // Tambahkan previewUrl ke dependency array jika logikanya bergantung padanya

  const getStatusMessageClasses = () => {
    if (statusMessage.status === 'success') {
      return 'bg-green-100 border border-green-200 text-green-700';
    } else if (statusMessage.status === 'error') {
      return 'bg-red-100 border border-red-200 text-red-700';
    } else { // 'info' or 'idle' (though idle usually means no message for 'idle')
      return 'bg-sky-100 border border-sky-200 text-sky-700';
    }
  };


  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'jenis') {
      setFormData((prev) => ({
        ...prev,
        jenis: value as "Pengaduan" | "Aspirasi" | "", // Cast ke tipe yang benar
        kategori: "" // Reset kategori saat jenis berubah
      }));
    } else if (name === 'kategori') {
      setFormData((prev) => ({ ...prev, kategori: value }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (statusMessage.status !== 'idle') {
      setStatusMessage({ status: 'idle', message: '' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (file) {
      const newPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(newPreviewUrl);
      setFormData(prev => ({ ...prev, bukti: file }));
    } else {
      setPreviewUrl(null);
      setFormData(prev => ({ ...prev, bukti: null }));
    }
  };

  const uploadFotoBukti = async (file: File, userId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`; // Simpan di bawah folder ID pengguna
      const { error } = await supabase.storage
        .from('bukti') // Pastikan bucket ini ada dan memiliki policy yang benar
        .upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('bukti').getPublicUrl(filePath);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error; // Lempar ulang error agar ditangkap oleh handleSubmit
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) {
      setStatusMessage({ status: 'error', message: 'Anda harus login terlebih dahulu untuk mengirim layanan.' });
      return;
    }
    if (!formData.jenis) {
      setStatusMessage({ status: 'error', message: 'Mohon pilih jenis layanan.' });
      return;
    }
    if (!formData.kategori) {
      setStatusMessage({ status: 'error', message: 'Mohon pilih kategori layanan.' });
      return;
    }
    if (!formData.isi.trim()) {
      setStatusMessage({ status: 'error', message: 'Mohon isi konten pengaduan/aspirasi.' });
      return;
    }
    setSubmitting(true);
    setStatusMessage({ status: 'info', message: 'Mengirim layanan...' });
    try {
      const layananBaru: Omit<Layanan, 'id' | 'created_at'> & { created_at?: string } = {
        jenis: formData.jenis as "Pengaduan" | "Aspirasi", // Pastikan jenis adalah Pengaduan atau Aspirasi
        kategori: formData.kategori,
        isi: formData.isi,
        status: "Belum Diproses",
        id_mhs: currentUser,
        foto_bukti: null
      };

      if (formData.bukti) {
        setStatusMessage({ status: 'info', message: 'Mengupload foto bukti...' });
        const photoUrl = await uploadFotoBukti(formData.bukti, currentUser);
        layananBaru.foto_bukti = photoUrl;
      }

      const { error } = await supabase.from('layanan').insert([layananBaru]);
      if (error) throw error;

      // Reset form setelah berhasil
      setFormData({
        jenis: "",
        kategori: "",
        isi: "",
        bukti: null
      });
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      setStatusMessage({ status: 'success', message: 'Layanan berhasil dikirim! Anda akan dialihkan ke halaman riwayat.' });
      
      // Alihkan setelah beberapa detik agar pengguna bisa membaca pesan sukses
      setTimeout(() => {
        router.push('/pages-mahasiswa/pengaduan_aspirasi');
      }, 2500); // Tunggu 2.5 detik sebelum redirect

    } catch (error) {
      console.error('Error submitting layanan:', error);
      setStatusMessage({ status: 'error', message: `Gagal mengirim layanan: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFormData(prev => ({ ...prev, bukti: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loadingUser) {
    return (
      <div className="flex min-h-screen theme-mahasiswa"> {/* Gunakan kelas tema mahasiswa */}
        <SidebarMahasiswa />
        <main className="flex-1 p-6 text-center bg-sky-100">Memuat data pengguna...</main> {/* Latar diubah ke sky-100 */}
      </div>
    );
  }

  // Generate category options based on selected jenis
  const categoryOptions = formData.jenis === "Pengaduan" 
    ? KATEGORI_OPTIONS.Pengaduan 
    : formData.jenis === "Aspirasi" 
    ? KATEGORI_OPTIONS.Aspirasi : [];
  
    // Define the condition for showing the status message here for clarity
  const shouldShowStatusMessage = 
      statusMessage.message && 
      !(statusMessage.status === 'error' && !currentUser && !loadingUser);

  return (
    <div className="flex min-h-screen theme-mahasiswa"> {/* Gunakan kelas tema mahasiswa */}
      <SidebarMahasiswa />
      <main className="flex-1 p-3 sm:p-4 md:p-6 bg-sky-100 ml-72"> {/* Tambahkan ml-72 */}
        <div className="max-w-7xl mx-auto bg-white p-4 rounded-lg shadow border border-sky-200"> {/* Lebar disamakan dengan halaman riwayat */}
          <div className="flex justify-between items-center mb-4"> {/* Margin bawah dikurangi */}
            <h1 className="text-xl md:text-2xl font-semibold text-blue-700">Formulir Pengaduan & Aspirasi</h1> {/* Diubah ke biru */}
          </div>
          <p className="text-sm text-sky-700 mb-4">Silakan isi formulir di bawah ini untuk menyampaikan pengaduan atau aspirasi Anda demi peningkatan kualitas layanan kampus.</p> {/* Margin bawah dikurangi */}

          {/* Tampilkan pesan jika pengguna tidak login */}
          {!currentUser && !loadingUser && statusMessage.status === 'error' && (
            <div className={`p-3 rounded-md text-sm mb-4 bg-red-100 border border-red-300 text-red-700`}> {/* Padding dan margin dikurangi */}
                {statusMessage.message}
                <Link href="/login" className="font-semibold hover:underline ml-1 text-red-700">Login di sini.</Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-sky-50 p-4 rounded-lg shadow-inner space-y-3 border border-sky-200"> {/* Padding dan space-y dikurangi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3"> {/* Gap dan margin dikurangi */}
              <div>
                <label className="text-sm font-medium text-blue-700 block mb-1">Jenis</label> {/* Diubah ke biru */}
                <select 
                  name="jenis" 
                  value={formData.jenis} 
                  onChange={handleChange} 
                  className="w-full border-sky-300 rounded-md shadow-sm px-3 py-2 focus:border-sky-500 focus:ring focus:ring-sky-500/50 transition-colors bg-white text-gray-700" /* Styling input disesuaikan */
                  required
                >
                  <option value="" disabled>Jenis Layanan</option>
                  <option value="Pengaduan">Pengaduan</option>
                  <option value="Aspirasi">Aspirasi</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-blue-700 block mb-1">Kategori</label> {/* Diubah ke biru */}
                <select 
                  name="kategori" 
                  value={formData.kategori} 
                  onChange={handleChange} 
                  className="w-full border-sky-300 rounded-md shadow-sm px-3 py-2 focus:border-sky-500 focus:ring focus:ring-sky-500/50 transition-colors bg-white text-gray-700" /* Styling input disesuaikan */
                  disabled={!formData.jenis}
                  required
                >
                  <option value="" disabled>
                    {formData.jenis ? `Pilih Kategori ${formData.jenis}` : 'Pilih Jenis Kategori'}
                  </option>
                  {formData.jenis && categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-blue-700 block mb-1.5">Detail {formData.jenis}</label> {/* Diubah ke biru */}
              <textarea 
                name="isi" 
                value={formData.isi} 
                onChange={handleChange} 
                className="w-full border-sky-300 rounded-md shadow-sm px-3 py-2 h-28 focus:border-sky-500 focus:ring focus:ring-sky-500/50 transition-colors bg-white text-gray-700" /* Tinggi textarea dikurangi */
                disabled={!formData.kategori}
                placeholder={`Uraian ${formData.jenis.toLowerCase()} Anda secara rinci di sini...`} 
              />
            </div>
            <div>
              <label className="text-sm font-medium text-blue-700 block mb-1">Foto Bukti (Opsional)</label> {/* Margin bawah dikurangi */}
              <div className="mt-2">
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" id="foto-bukti-input" />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  className="px-4 py-2 bg-sky-100 border border-sky-300 rounded-md font-medium text-sm text-sky-700 hover:bg-sky-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400 transition-colors" /* Styling tombol disesuaikan */
                >
                  Pilih Foto
                </button>
                {formData.bukti && (
                  <div className="mt-1.5 flex items-center text-sm text-blue-700"> {/* Margin atas dikurangi */}
                    <span>{formData.bukti.name} ({(formData.bukti.size / 1024).toFixed(1)} KB)</span>
                    <button type="button" onClick={handleRemoveFile} className="ml-3 text-red-500 hover:text-red-700 font-medium">Hapus</button>
                  </div>
                )}
              </div>
              {previewUrl && (
                <div className="mt-2 bg-sky-50 p-2 rounded-md border border-sky-200 inline-block"> {/* Margin atas dikurangi */}
                  <img src={previewUrl} alt="Preview Bukti" className="max-w-xs max-h-48 rounded-md object-contain" />
                </div>
              )}
              <p className="text-xs text-sky-700 mt-1.5">Format yang didukung: JPG, PNG, GIF.</p> {/* Margin atas dikurangi */}
            </div>
            {/* Conditional rendering for status message */}
            {shouldShowStatusMessage ? (
              <div className={`p-2.5 rounded-md text-sm ${getStatusMessageClasses()}`}>
                {statusMessage.message}
              </div>
            ) : null}
            <div className="flex justify-end mt-2"> {/* Tambahkan mt-2 untuk margin atas */}
              <button type="submit" disabled={submitting || !currentUser || loadingUser} className="bg-sky-600 text-white px-5 py-2 rounded-md font-medium hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"> {/* Padding tombol dikurangi */}
                {submitting ? "Mengirim..." : "Kirim Layanan"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}