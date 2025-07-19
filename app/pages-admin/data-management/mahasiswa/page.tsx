'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { User, FileEdit, Trash2, AlertCircle, GraduationCap, Search, ArrowLeft } from 'lucide-react'; // Import Search and ArrowLeft icon
import { deleteMahasiswaAction } from '@/app/actions'; // Assuming deleteMahasiswaAction is still needed here
import SidebarAdmin from '@/components/SidebarAdmin';

// Define TypeScript interfaces
interface MahasiswaData {
    id_mhs: string;
    nim: string;
    nama: string;
    email: string | null; // Tambahkan field email
    kelas: string | null;
    jabatan_kelas: string | null;
    angkatan: string | null;
    prodi: string | null;
    foto_profil: string | null;
}

interface AlertState {
    show: boolean;
    message: string;
    type: 'success' | 'error' | '';
}

// Define possible Jabatan Kelas options
const JABATAN_KELAS_OPTIONS = [
    'Anggota Kelas',
    'Sekretaris',
];

// Define roles that must be unique per class
const UNIQUE_JABATAN_KELAS = JABATAN_KELAS_OPTIONS.filter(jabatan => jabatan !== 'Anggota Kelas');

const ALWAYS_INCLUDE_PRODIS = [
    "D3 Teknik Kimia",
    "D4 Teknik Energi", // Ditambahkan
    "D4 Teknologi Kimia Industri", // Ditambahkan
    "D3 Teknik Kimia PSDKU Siak"
];

export default function MahasiswaManagement() {
    const [mahasiswa, setMahasiswa] = useState<MahasiswaData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>(''); // State untuk pencarian
    const [alert, setAlert] = useState<AlertState>({ show: false, message: '', type: '' });
    const [selectedProdiFilter, setSelectedProdiFilter] = useState<string>('');
    const [selectedAngkatanFilter, setSelectedAngkatanFilter] = useState<string>('');
    const [prodiOptions, setProdiOptions] = useState<string[]>([]);
    const [angkatanOptions, setAngkatanOptions] = useState<string[]>([]);
    const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);
    const [selectedMahasiswa, setSelectedMahasiswa] = useState<MahasiswaData | null>(null);
    const [editMode, setEditMode] = useState<boolean>(false);
    const [editData, setEditData] = useState({
        nim: '',
        nama: '',
        email: '', // Tambahkan email ke state editData
        kelas: '',
        jabatan_kelas: '',
        angkatan: '',
        prodi: ''
    });

    const supabase = createClient();

    const fetchMahasiswa = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('mahasiswa')
                .select('*')
                .order('nama');

            if (error) throw error;
            setMahasiswa(data || []);

            // Logic to determine prodiOptions, ensuring ALWAYS_INCLUDE_PRODIS are always included
            let prodisFromData: string[] = [];
            if (data && data.length > 0) {
                prodisFromData = Array.from(
                    new Set(data.map(mhs => mhs.prodi).filter(prodi => prodi !== null && prodi !== undefined && prodi.trim() !== '') as string[])
                );
            }

            // Prodis from data that are not in ALWAYS_INCLUDE_PRODIS, sorted alphabetically
            const additionalProdis = prodisFromData
                .filter(p => !ALWAYS_INCLUDE_PRODIS.includes(p))
                .sort();

            // Combine, ensuring ALWAYS_INCLUDE_PRODIS come first in their defined order,
            // followed by other unique prodis from data (additionalProdis).
            const finalProdiOptions = [...ALWAYS_INCLUDE_PRODIS, ...additionalProdis];
            setProdiOptions(finalProdiOptions);

        } catch (error) {
            console.error('Error fetching mahasiswa:', error);
            showAlert('Failed to load mahasiswa data', 'error');
            setMahasiswa([]);
            setProdiOptions([...ALWAYS_INCLUDE_PRODIS]); // Ensure specific prodis are options even on error, in their defined order
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMahasiswa();
    }, []);

    useEffect(() => {
        let angkatansToConsider = mahasiswa;
        if (selectedProdiFilter) {
            angkatansToConsider = mahasiswa.filter(mhs => mhs.prodi === selectedProdiFilter);
        }
        const uniqueAngkatans = Array.from(
            new Set(angkatansToConsider.map(mhs => mhs.angkatan).filter(angkatan => angkatan !== null && angkatan !== undefined && angkatan.trim() !== '') as string[])
        ).sort((a, b) => b.localeCompare(a));
        setAngkatanOptions(uniqueAngkatans);
        setSelectedAngkatanFilter('');
    }, [mahasiswa, selectedProdiFilter]);

    const showAlert = (message: string, type: 'success' | 'error') => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
    };

    const confirmDelete = (mahasiswaData: MahasiswaData) => {
        setSelectedMahasiswa(mahasiswaData);
        setShowConfirmDelete(true);
    };

    const handleDelete = async () => {
        if (!selectedMahasiswa) return;
        try {
            const result = await deleteMahasiswaAction(selectedMahasiswa.id_mhs);
            if (result.success) {
                showAlert(result.message, 'success');
                fetchMahasiswa();
            } else if (result.partialSuccess) {
                showAlert(result.message, 'error');
                fetchMahasiswa();
            } else {
                showAlert(result.message, 'error');
            }
        } catch (error) {
            console.error('Error in delete operation:', error);
            showAlert('Failed to delete mahasiswa', 'error');
        } finally {
            setShowConfirmDelete(false);
            setSelectedMahasiswa(null);
        }
    };

    const startEdit = (mahasiswaData: MahasiswaData) => {
        setEditData({
            nim: mahasiswaData.nim,
            nama: mahasiswaData.nama,
            email: mahasiswaData.email || '', // Email diisi dari data mahasiswa yang ada
            kelas: mahasiswaData.kelas || '',
            jabatan_kelas: mahasiswaData.jabatan_kelas || '',
            angkatan: mahasiswaData.angkatan || '',
            prodi: mahasiswaData.prodi || ''
        });
        setSelectedMahasiswa(mahasiswaData);
        setEditMode(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };

        const handleUpdate = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!selectedMahasiswa) return;
    
            const selectedJabatan = editData.jabatan_kelas;
            const currentKelas = editData.kelas; // Menggunakan editData.kelas karena ini adalah nilai yang tidak berubah
    
            if (UNIQUE_JABATAN_KELAS.includes(selectedJabatan)) {
                const existingMahasiswaWithSameJabatan = mahasiswa.find(mhs =>
                    mhs.id_mhs !== selectedMahasiswa.id_mhs &&
                    mhs.kelas === currentKelas && // Pastikan kelas yang dicek adalah kelas mahasiswa yang sedang diedit
                    mhs.prodi === selectedMahasiswa.prodi && // Tambahkan pengecekan prodi
                    mhs.angkatan === selectedMahasiswa.angkatan && // Tambahkan pengecekan angkatan
                    mhs.jabatan_kelas === selectedJabatan
                );
                if (existingMahasiswaWithSameJabatan) {
                    showAlert(`Jabatan "${selectedJabatan}" sudah ada untuk kelas "${currentKelas}" di prodi dan angkatan yang sama. Silakan pilih jabatan lain.`, 'error');
                    return;
                }
            }
    
            try {
                const { error } = await supabase
                    .from('mahasiswa')
                    .update({
                        // Hanya jabatan_kelas yang diupdate
                        jabatan_kelas: editData.jabatan_kelas,
                    })
                    .eq('id_mhs', selectedMahasiswa.id_mhs);
    
                if (error) {
                    console.error('Error updating mahasiswa:', error);
                    showAlert('Gagal memperbarui data mahasiswa', 'error');
                    return;
                }
                showAlert(`Jabatan kelas untuk ${selectedMahasiswa.nama} berhasil diperbarui.`, 'success');
                fetchMahasiswa();
                setEditMode(false);
                setSelectedMahasiswa(null);
            } catch (error) {
                console.error('Unexpected error updating mahasiswa:', error);
                showAlert('Terjadi kesalahan tak terduga saat memperbarui data', 'error');
            }
        };
    

    // Logika filter data mahasiswa
    const filteredMahasiswa = mahasiswa.filter(mhs => {
        // Filter berdasarkan Search Term
        const searchMatch = searchTerm === '' ||
            mhs.nim?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            mhs.email?.toLowerCase().includes(searchTerm.toLowerCase()) || // Tambahkan pencarian berdasarkan email
            mhs.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            mhs.kelas?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            mhs.jabatan_kelas?.toLowerCase().includes(searchTerm.toLowerCase());

        if (!searchMatch) return false; // Jika tidak cocok dengan pencarian, langsung filter keluar

        // Filter berdasarkan Prodi dan Angkatan
        const prodiMatch = selectedProdiFilter === '' || mhs.prodi === selectedProdiFilter;
        const angkatanMatch = selectedAngkatanFilter === '' || mhs.angkatan === selectedAngkatanFilter;
        return prodiMatch && angkatanMatch;
    });

    return (
        <div className="min-h-screen theme-admin">
            <SidebarAdmin />
            <main className="ml-72 px-2 py-4 md:px-4 md:py-6 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto">
                <div className="w-full">
                    {/* Judul hanya ditampilkan jika tidak dalam mode edit */}
                    {!editMode && (
                        <h1 className="text-2xl font-bold mb-6 text-foreground flex items-center">
                            <GraduationCap className="mr-3 w-6 h-6 text-primary" />
                            Manajemen Data Mahasiswa
                        </h1>
                    )}
                    {alert.show && (
                        <div className={`mb-4 p-3 rounded flex items-center ${alert.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-destructive/20 text-destructive'}`}>
                            <AlertCircle className="w-5 h-5 mr-2" />
                            {alert.message}
                        </div>
                    )}

                    {/* Conditional rendering based on editMode */}
                    {editMode && selectedMahasiswa ? (
                        // --- Form Edit Mahasiswa ---
                        <>
                            {/* Judul Form Edit dan Tombol Kembali - dipindahkan ke luar card */}
                            <div className="mb-4 flex items-center">
                                <button
                                    onClick={() => {
                                        setEditMode(false);
                                        setSelectedMahasiswa(null);
                                    }}
                                    className="mr-3 p-2 rounded-md hover:bg-muted transition-colors"
                                    title="Kembali ke daftar mahasiswa"
                                >
                                    <ArrowLeft className="w-6 h-6 text-foreground" />
                                </button>
                                <h2 className="text-xl font-bold text-foreground">Edit Data Mahasiswa: {selectedMahasiswa.nama}</h2>
                            </div>
                            <div className="mb-6 bg-card p-4 rounded-lg shadow text-card-foreground">
                            <form onSubmit={handleUpdate}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">NIM</label>
                                        <input
                                            type="text"
                                            name="nim"
                                            value={editData.nim}
                                            onChange={handleInputChange}
                                            className="w-full border border-input rounded-md px-3 py-2 bg-muted text-muted-foreground cursor-not-allowed"
                                            required
                                            disabled // Read-only
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nama</label>
                                        <input
                                            type="text"
                                            name="nama"
                                            value={editData.nama}
                                            onChange={handleInputChange}
                                            className="w-full border border-input rounded-md px-3 py-2 bg-muted text-muted-foreground cursor-not-allowed"
                                            required
                                            disabled // Read-only
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={editData.email}
                                            onChange={handleInputChange}
                                            className="w-full border border-input rounded-md px-3 py-2 bg-muted text-muted-foreground cursor-not-allowed"
                                            disabled // Read-only
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Kelas</label>
                                        <input
                                            type="text"
                                            name="kelas"
                                            value={editData.kelas}
                                            onChange={handleInputChange}
                                            disabled // Selalu disabled (read-only)
                                            className="w-full border border-input rounded-md px-3 py-2 bg-muted text-muted-foreground cursor-not-allowed"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Jabatan Kelas</label>
                                        <select
                                            name="jabatan_kelas"
                                            value={editData.jabatan_kelas}
                                            onChange={handleInputChange}
                                            className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground appearance-none"
                                            required
                                        >
                                            {JABATAN_KELAS_OPTIONS.map(option => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Angkatan</label>
                                        <input
                                            type="text"
                                            name="angkatan"
                                            value={editData.angkatan}
                                            onChange={handleInputChange}
                                            disabled // Selalu disabled (read-only)
                                            className="w-full border border-input rounded-md px-3 py-2 bg-muted text-muted-foreground cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Program Studi</label>
                                        <input
                                            type="text"
                                            name="prodi"
                                            value={editData.prodi}
                                            onChange={handleInputChange}
                                            disabled // Selalu disabled (read-only)
                                            className="w-full border border-input rounded-md px-3 py-2 bg-muted text-muted-foreground cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    {/* Tombol "Batal" di footer form dihilangkan. Pengguna dapat menggunakan tombol "Kembali ke daftar" di atas form. */}
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                    >
                                        Simpan Perubahan
                                    </button>
                                </div>
                            </form>
                        </div>
                        </>
                    ) : (
                        // --- Tampilkan search, filter, dan tabel saat editMode tidak aktif ---
                        <>
                            {/* Search Input Section */}
                            <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="relative flex-grow w-full md:w-auto">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Cari mahasiswa..."
                                        className="pl-10 pr-4 py-2 w-full border border-input rounded-lg bg-background text-foreground focus:ring-ring focus:border-ring"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Filter Section */}
                            <div className="bg-card rounded-xl shadow-lg overflow-hidden mb-8">
                                <div className="bg-muted px-5 py-3 border-b border-border">
                                    <h3 className="text-base font-semibold text-card-foreground flex items-center">
                                        <GraduationCap className="mr-2 h-5 w-5 text-muted-foreground" />
                                        Filter Data Mahasiswa
                                    </h3>
                                </div>
                                <div className="px-5 py-4 space-y-5">
                                    <div>
                                        <label htmlFor="prodiFilter" className="block text-sm font-medium text-muted-foreground mb-1.5">
                                            Program Studi
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedProdiFilter('')}
                                                className={`px-3 py-1.5 text-sm font-medium rounded-md shadow-sm transition-colors duration-150 ease-in-out
                                                    ${selectedProdiFilter === ''
                                                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                                    }`}
                                            >
                                                Semua Program Studi
                                            </button>
                                            {prodiOptions.map(prodi => (
                                                <button
                                                    key={prodi}
                                                    type="button"
                                                    onClick={() => setSelectedProdiFilter(prodi)}
                                                    className={`px-3 py-1.5 text-sm font-medium rounded-md shadow-sm transition-colors duration-150 ease-in-out
                                                        ${selectedProdiFilter === prodi
                                                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                                        }`}
                                                >
                                                    {prodi}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Filter Angkatan - Muncul setelah Prodi dipilih */}
                                    {selectedProdiFilter && (
                                        <div>
                                            <label htmlFor="angkatanFilter" className="block text-sm font-medium text-muted-foreground mb-1.5">
                                                Angkatan (dari Prodi: {selectedProdiFilter})
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedAngkatanFilter('')}
                                                    className={`px-3 py-1.5 text-sm font-medium rounded-md shadow-sm transition-colors duration-150 ease-in-out
                                                        ${selectedAngkatanFilter === ''
                                                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                                        }`}
                                                >
                                                    Semua Angkatan
                                                </button>
                                                {angkatanOptions.map(angkatan => (
                                                    <button
                                                        key={angkatan}
                                                        type="button"
                                                        onClick={() => setSelectedAngkatanFilter(angkatan)}
                                                        className={`px-3 py-1.5 text-sm font-medium rounded-md shadow-sm transition-colors duration-150 ease-in-out
                                                            ${selectedAngkatanFilter === angkatan
                                                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                                            }`}
                                                    >
                                                        {angkatan}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Table Section */}
                            <div className="bg-card rounded-lg shadow overflow-hidden">
                                {loading ? (
                                    <div className="p-6 text-center text-muted-foreground text-sm">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-muted-foreground mx-auto mb-2"></div>
                                        Memuat data mahasiswa...
                                    </div>
                                ) : mahasiswa.length === 0 ? (
                                    <div className="p-6 text-center text-muted-foreground text-sm">
                                        Belum ada data mahasiswa.
                                    </div>
                                ) : filteredMahasiswa.length === 0 && (searchTerm !== '' || selectedProdiFilter !== '' || selectedAngkatanFilter !== '') ? ( // Sesuaikan kondisi pesan "tidak ada data"
                                    <div className="p-6 text-center text-muted-foreground text-sm">
                                        {(() => {
                                            if (selectedProdiFilter && selectedAngkatanFilter) {
                                                return `Tidak ada mahasiswa untuk program studi "${selectedProdiFilter}" dan angkatan "${selectedAngkatanFilter}".`;
                                            } else if (selectedProdiFilter) {
                                                return `Tidak ada mahasiswa untuk program studi "${selectedProdiFilter}".`;
                                            } else if (selectedAngkatanFilter) {
                                                return `Tidak ada mahasiswa untuk angkatan "${selectedAngkatanFilter}".`;
                                            }
                                            return "Tidak ada mahasiswa yang sesuai dengan filter yang dipilih.";
                                        })()}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full divide-y divide-border table-auto">
                                            <thead className="bg-muted">
                                                <tr>
                                                    <th className="px-1 py-2 text-center text-sm font-medium text-muted-foreground uppercase tracking-wider w-[10%]">Foto</th>
                                                    <th className="px-1 py-2 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider w-[16%]">Nama</th>
                                                    <th className="px-1 py-2 text-center text-sm font-medium text-muted-foreground uppercase tracking-wider w-[15%]">NIM</th>
                                                    <th className="px-1 py-2 text-center text-sm font-medium text-muted-foreground uppercase tracking-wider hidden">Angkatan</th>
                                                    <th className="px-1 py-2 text-center text-sm font-medium text-muted-foreground uppercase tracking-wider w-[18%]">Prodi</th>
                                                    <th className="px-1 py-2 text-center text-sm font-medium text-muted-foreground uppercase tracking-wider w-[10%]">Kelas</th>
                                                    <th className="px-1 py-2 text-center text-sm font-medium text-muted-foreground uppercase tracking-wider w-[14%] hidden">Jabatan Kelas</th>
                                                    <th className="px-1 py-2 text-center text-sm font-medium text-muted-foreground uppercase tracking-wider w-[10%]">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-card divide-y divide-border">
                                                {filteredMahasiswa.map((mhs, index) => (
                                                    <tr key={mhs.id_mhs} className={index % 2 !== 0 ? 'bg-muted/40' : ''}>
                                                        <td className="px-1 py-2 whitespace-nowrap text-center">
                                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-muted mx-auto">
                                                                {mhs.foto_profil ? (
                                                                    <img
                                                                        src={mhs.foto_profil}
                                                                        alt={mhs.nama}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                                        <User className="w-5 h-5" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-1 py-2 whitespace-nowrap text-sm text-left truncate" title={mhs.nama}>{mhs.nama}</td>
                                                        <td className="px-1 py-2 whitespace-nowrap text-sm text-muted-foreground text-center truncate" title={mhs.nim}>{mhs.nim}</td>
                                                        <td className="px-1 py-2 whitespace-nowrap text-sm text-muted-foreground text-center truncate hidden" title={mhs.angkatan || undefined}>{mhs.angkatan || '-'}</td>
                                                        <td className="px-1 py-2 whitespace-nowrap text-sm text-muted-foreground text-center truncate" title={mhs.prodi || undefined}>{mhs.prodi || '-'}</td>
                                                        <td className="px-1 py-2 whitespace-nowrap text-sm text-muted-foreground text-center truncate" title={mhs.kelas || undefined}>{mhs.kelas || '-'}</td>
                                                        <td className="px-1 py-2 whitespace-nowrap text-sm text-muted-foreground text-center truncate hidden" title={mhs.jabatan_kelas || undefined}>{mhs.jabatan_kelas || '-'}</td>
                                                        <td className="px-1 py-2 whitespace-nowrap text-sm font-medium text-center">
                                                            <button
                                                                onClick={() => startEdit(mhs)}
                                                                className="text-secondary hover:text-secondary/80 mr-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                disabled={editMode}
                                                                title="Edit Data"
                                                            >
                                                                <FileEdit className="h-4 w-4" /> {/* Ukuran ikon sudah sama */}
                                                            </button>
                                                            <button
                                                                onClick={() => confirmDelete(mhs)}
                                                                className="text-destructive hover:text-destructive/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                disabled={showConfirmDelete || editMode}
                                                                title="Hapus Data"
                                                            >
                                                                <Trash2 className="h-4 w-4" /> {/* Ukuran ikon sudah sama */}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {showConfirmDelete && selectedMahasiswa && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full text-card-foreground">
                                <h3 className="text-lg font-semibold mb-4">Konfirmasi Penghapusan</h3> {/* text-lg is fine for modal title */}
                                <p className="mb-6 text-sm">
                                    Apakah Anda yakin ingin menghapus data mahasiswa: <span className="font-semibold">{selectedMahasiswa.nama}</span> ({selectedMahasiswa.nim})?
                                </p>
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmDelete(false)}
                                        className="mr-2 px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 text-sm"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 text-sm"
                                    >
                                        Hapus
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}