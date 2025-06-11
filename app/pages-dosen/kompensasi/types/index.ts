// pages-dosen/kompensasi/types/index.ts

/**
 * Represents a student user.
 * Mewakili pengguna mahasiswa.
 */
export interface Student {
    id_mhs: string; // Corresponds to auth.users.id (Sesuai dengan auth.users.id)
    nim: string;
    nama: string;
    kelas: string;
    angkatan: string; // Added from schema image (Ditambahkan dari gambar skema)
    prodi: string;
    jabatan_kelas?: 'Sekretaris' | string | null; // More specific type if possible (Tipe lebih spesifik jika memungkinkan)
    foto_profil?: string | null; // Added from schema image (Ditambahkan dari gambar skema)
}

/**
 * Represents a single student's attendance recap record for a period.
 * This record can be linked to a batch Kompensasi submission.
 * Mewakili rekap kehadiran satu mahasiswa untuk suatu periode.
 * Rekap ini dapat ditautkan ke satu pengajuan Kompensasi batch.
 */
export interface RekapKehadiran {
    id: string; // Assuming UUID, change to number if integer PK (Asumsi UUID, ubah ke number jika PK integer)
    id_mhs: string; // FK to mahasiswa.id_mhs
    id_sekretaris: string; // FK to mahasiswa.id_mhs (secretary who created/updated - sekretaris yg membuat/memperbarui)
    kelas: string;
    menit_tidak_hadir: number;
    is_published?: boolean | null; // Or similar flag indicating secretary saved it (Atau flag serupa yg menandakan sekretaris menyimpannya)
    id_kompensasi: string | null; // FK to kompensasi.id (links to the batch submission - tautan ke pengajuan batch)
    created_at: string;
    updated_at?: string | null;
}

/**
 * Represents the overall compensation session information set by admin.
 * Mewakili informasi sesi kompensasi keseluruhan yang diatur oleh admin.
 */
// d:\New folder\si_tekkim\app\pages-mahasiswa\kompensasi\types\index.ts
export interface KompenInfo {
    id: string;
    is_kompensasi_active: boolean;
    kompensasi_start_date: string | null;
    kompensasi_end_date: string | null;
    semester: string | null; // Bisa null jika belum diisi admin
    tahun_ajaran: string | null; // Bisa null jika belum diisi admin
    nomor_surat: string | null; // Bisa null jika belum diisi admin
    // ...
}

/**
 * Represents an Academic Advisor (Dosen Pembimbing Akademik).
 * Mewakili Dosen Pembimbing Akademik (Dosen PA).
 */
export interface DosenPA {
    id_dsn: string; // Assuming UUID for Dosen ID (Asumsi UUID untuk ID Dosen)
    nama: string;
    nip?: string | null; // Added from schema (Ditambahkan dari skema)
    email?: string | null; // Added for fetching based on auth user (Ditambahkan untuk fetch berdasarkan user auth)
    // Flag to indicate if this Dosen PA handles kompensasi.
    is_pa_kompensasi?: boolean; // Note: Authorization for kompensasi monitoring page now primarily checks 'kelas_dosen_pa' table.
    // Add other dosen fields if needed elsewhere (Tambahkan field dosen lain jika perlu)
}

/**
 * Represents a batch compensation submission for an entire class.
 * Mewakili satu pengajuan kompensasi batch untuk seluruh kelas.
 */
export interface Kompensasi {
    id: string; // PK, Assuming UUID (PK, Asumsi UUID)
    id_sekretaris: string; // FK to mahasiswa.id_mhs (secretary who submitted - sekretaris yg mengajukan)
    id_dosen_pa: string; // FK to dosen.id_dsn (PA assigned to verify - PA yg ditugaskan verifikasi)
    kelas: string;
    status: 'pending_admin_review' | // Diajukan ke admin, menunggu review admin
            'admin_verified' |       // Disetujui oleh admin
            'admin_rejected' |       // Ditolak oleh admin
            'execution_confirmed' |  // Pelaksanaan kompensasi telah dikonfirmasi oleh sekretaris
            'pending' |              // Status legacy: Menunggu verifikasi Dosen PA
            'verified' |             // Status legacy: Diverifikasi oleh Dosen PA
            'rejected' |             // Status legacy: Ditolak oleh Dosen PA
            null;                    // Status bisa jadi null jika belum diinisialisasi atau kasus tertentu
    catatan_dosen?: string | null; // Notes from Dosen PA during verification (Catatan dari Dosen PA saat verifikasi)
    file_surat?: string | null; // Link/path to the generated compensation letter (after verification - Tautan/path surat kompensasi yg dibuat)
    semester: string; // Semester this batch applies to (from KompenInfo - Semester yg berlaku untuk batch ini)
    tahun_ajaran: string; // Academic year this batch applies to (from KompenInfo - Tahun ajaran yg berlaku untuk batch ini)
    created_at: string;
    updated_at?: string | null;
}

// --- Utility Types / Tipe Utilitas ---

/**
 * Represents the structure for storing minutes input locally in the component state.
 * Key is student id_mhs.
 * Mewakili struktur penyimpanan input menit secara lokal di state komponen.
 * Key adalah id_mhs mahasiswa.
 */
export interface RekapData {
    [key: string]: number;
}

/**
 * Represents the status of a batch action (save, submit, generate, verify, reject).
 * Mewakili status aksi batch (simpan, ajukan, buat, verifikasi, tolak).
 */
export interface BatchActionStatus {
    status: 'idle' | 'success' | 'error' | 'info'; // Added 'info' (Ditambahkan 'info')
    message: string;
}