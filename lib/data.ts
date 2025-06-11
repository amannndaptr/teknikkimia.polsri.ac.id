import { createClient } from '@/utils/supabase/server'; // Atau client jika digunakan di client component

interface Mahasiswa {
  id_mhs: string;
  nama: string;
  nim: string;
  // Tambahkan properti lain yang Anda select dari tabel mahasiswa jika diperlukan
}
// d:\New folder\si_tekkim\lib\data.ts
// ...
export async function getDaftarMahasiswaKelas(targetKelas: string, targetProdi: string, targetAngkatan: string) {
  const supabase = await createClient(); 

  const { data: mahasiswaList, error } = await supabase
    .from('mahasiswa')
    .select('id_mhs, nama, nim') 
    .eq('kelas', targetKelas)
    .eq('prodi', targetProdi)
    .eq('angkatan', targetAngkatan) // <-- INI DIA KUNCINYA!
    .order('nama', { ascending: true }); 
// ...

  if (error) {
    console.error("Error fetching daftar mahasiswa:", error);
    return [];
  }
  return mahasiswaList as Mahasiswa[]; // Memberikan tipe yang lebih spesifik
}

// Anda bisa menambahkan fungsi-fungsi query data lainnya di sini