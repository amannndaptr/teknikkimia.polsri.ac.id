// types/index.ts

/**
 * Represents a student user.
 */
export interface Student {
    id_mhs: string; // Corresponds to auth.users.id
    nim: string;
    nama: string;
    kelas: string;
    angkatan: string; // Added from schema image
    prodi: string;
    jabatan_kelas?: 'Sekretaris' | string | null; // More specific type if possible
    foto_profil?: string | null; // Added from schema image
}

/**
 * Represents a single student's attendance recap record for a period.
 * This record can be linked to a batch Kompensasi submission.
 */
export interface RekapKehadiran {
    id: string; // Assuming UUID, change to number if integer PK
    id_mhs: string; // FK to mahasiswa.id_mhs
    id_sekretaris: string; // FK to mahasiswa.id_mhs (secretary who created/updated)
    kelas: string;
    menit_tidak_hadir: number;
    is_published?: boolean | null; // Or similar flag indicating secretary saved it
    id_kompensasi: string | null; // FK to kompensasi.id (links to the batch submission)
    created_at: string;
    updated_at?: string | null;
}

/**
 * Represents the overall compensation session information set by admin.
 */
export interface KompenInfo {
    id: string; // Assuming UUID
    is_kompensasi_active: boolean;
    kompensasi_start_date: string | null;
    kompensasi_end_date: string | null;
    semester: string | null; // Bisa null jika belum diisi admin
    tahun_ajaran: string | null; // Bisa null jika belum diisi admin
    nomor_surat: string | null; // Bisa null jika belum diisi admin, dibuat opsional menjadi non-opsional agar konsisten dengan dosen
    created_at: string;
    updated_at?: string | null;
}

/**
 * Represents an Academic Advisor (Dosen Pembimbing Akademik).
 */
export interface DosenPA {
    id_dsn: string; // Assuming UUID for Dosen ID
    nama: string;
    nip?: string | null; // Added from schema
    // Add other dosen fields if needed elsewhere
}

/**
 * Represents a batch compensation submission for an entire class.
 */
export interface Kompensasi {
    id: string; // PK, Assuming UUID
    id_sekretaris: string; // FK to mahasiswa.id_mhs (secretary who submitted)
    id_dosen_pa: string; // FK to dosen.id_dsn (PA assigned to verify)
    kelas: string;
    status: 'pending_admin_review' |   // Diajukan ke admin, menunggu review admin
            'admin_verified' |         // Disetujui oleh admin
            'admin_rejected' |         // Ditolak oleh admin
            'execution_confirmed' |    // Pelaksanaan kompensasi telah dikonfirmasi oleh sekretaris
            'pending' |                // Status legacy: Menunggu verifikasi Dosen PA
            'verified' |               // Status legacy: Diverifikasi oleh Dosen PA
            'rejected' |               // Status legacy: Ditolak oleh Dosen PA
            null;                      // Status bisa jadi null jika belum diinisialisasi atau kasus tertentu
    catatan_dosen?: string | null; // Notes from Dosen PA during verification
    file_surat?: string | null; // Link/path to the generated compensation letter (after verification)
    semester: string; // Semester this batch applies to (from KompenInfo)
    tahun_ajaran: string; // Academic year this batch applies to (from KompenInfo)
    created_at: string;
    updated_at?: string | null;
}

// --- Utility Types ---

/**
 * Represents the structure for storing minutes input locally in the component state.
 * Key is student id_mhs.
 */
export interface RekapData {
    [key: string]: number;
}

/**
 * Represents the status of a batch action (save, submit, generate).
 */
export interface BatchActionStatus {
    status: 'idle' | 'success' | 'error' | 'info'; // Added 'info'
    message: string;
}

// Potentially useful if tracking individual save status, though batch save is likely better
// export interface SavedStatus {
//  [key: string]: { status: 'success' | 'error'; message: string } | null;
// }

// Add other utility types if needed, e.g., for API responses



export interface SavedStatus {
    [key: string]: { status: 'success' | 'error'; message: string } | null;
}