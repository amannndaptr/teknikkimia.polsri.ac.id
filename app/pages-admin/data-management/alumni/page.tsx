'use client'; // Mengubah menjadi Client Component

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client'; // Untuk fetch data di client
// import { revalidatePath } from 'next/cache'; // Tidak digunakan langsung di client component
// import { redirect } from 'next/navigation'; // Tidak digunakan langsung di client component (kecuali via actions)
import SidebarAdmin from '@/components/SidebarAdmin'; // Pastikan path ini benar
import { UserPlus, FileEdit, Trash2, Search, AlertCircle, Filter, Loader2, Users2Icon, KeyRound, RefreshCw, ArrowLeft } from 'lucide-react';
import { addAlumniAction, updateAlumniAction, deleteAlumniAction } from '@/app/alumni_actions'; // Impor server actions

// --- Tipe Data dan State untuk Client Component ---
interface AlumniData {
    id: number;
    nama: string;
    prodi: string | null;
    angkatan: number | null;
    pekerjaan: string | null;
    testimoni: string | null;
    foto: string | null;
    created_at?: string;
    updated_at?: string;
    user_id?: string | null;
}

interface AlertState {
    show: boolean;
    message: string;
    type: 'success' | 'error' | '';
}

const prodiOptions = [
    "D3 Teknik Kimia",
    "D4 Teknik Energi",
    "D4 Teknologi Kimia Industri",
    "D3 Teknik Kimia PSDKU SIAK"
];

export default function AlumniManagementPage() {
    const [alumniList, setAlumniList] = useState<AlumniData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [alert, setAlert] = useState<AlertState>({ show: false, message: '', type: '' });
    const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);
    const [selectedAlumni, setSelectedAlumni] = useState<AlumniData | null>(null);
    const [editMode, setEditMode] = useState<boolean>(false);
    const [addMode, setAddMode] = useState<boolean>(false);    
    const [filterProdi, setFilterProdi] = useState<string>('');
    const [filterAngkatan, setFilterAngkatan] = useState<string>('');
    const [formSubmitting, setFormSubmitting] = useState(false);


    const [editData, setEditData] = useState({
        id: 0,
        nama: '',
        prodi: '',
        angkatan: '',
        pekerjaan: '',
        email: '', // Tambahkan email
        password: '', // Tambahkan password
        confirmPassword: '', // Tambahkan konfirmasi password
    });

    const supabase = createClient(); // Client-side Supabase

    const fetchAlumni = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('alumni')
                .select('*')
                .order('nama', { ascending: true });

            if (error) throw error;
            setAlumniList(data || []);
        } catch (error: any) {
            console.error('Error fetching alumni:', error);
            showAlert(`Gagal memuat data alumni: ${error.message}`, 'error');
            setAlumniList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Check URL for messages (jika ada redirect dari server action sebelumnya)
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type');
        const message = urlParams.get('message');

        if (type && message) {
            showAlert(decodeURIComponent(message), type as 'success' | 'error');
            const url = new URL(window.location.href);
            url.searchParams.delete('type');
            url.searchParams.delete('message');
            window.history.replaceState({}, '', url);
        }
        fetchAlumni();
    }, []);

    // Efek untuk mereset filter angkatan setiap kali filter prodi berubah
    useEffect(() => {
        setFilterAngkatan(''); // Selalu reset filter angkatan ketika prodi berubah
    }, [filterProdi]); // Hanya bergantung pada filterProdi


    const showAlert = (message: string, type: 'success' | 'error') => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
    };

    const confirmDelete = (alumniData: AlumniData) => {
        setSelectedAlumni(alumniData);
        setShowConfirmDelete(true);
    };

    const startEdit = (alumniData: AlumniData) => {
        setEditData({
            id: alumniData.id,
            nama: alumniData.nama,
            prodi: alumniData.prodi || '',
            angkatan: alumniData.angkatan?.toString() || '',
            pekerjaan: alumniData.pekerjaan || '',
            email: '', // Tambahkan nilai default untuk email
            password: '', // Tambahkan nilai default untuk password
            confirmPassword: '', // Tambahkan nilai default untuk confirmPassword
            // testimoni: alumniData.testimoni || '', // Dihapus
        });
        setSelectedAlumni(alumniData);
        setEditMode(true);
        setAddMode(false);
    };

    const startAdd = () => {
        setEditData({
            id: 0,
            nama: '',
            prodi: '',
            angkatan: '',
            pekerjaan: '',
            email: '',
            password: '',
            confirmPassword: '',
        });
        setAddMode(true);
        setEditMode(false);
        setSelectedAlumni(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };

    const generatePassword = () => {
        if (!editData.nama || !editData.angkatan) {
            showAlert('Nama dan Angkatan diperlukan untuk membuat password', 'error');
            return;
        }

        // Ambil nama depan (kata pertama sebelum spasi)
        const firstName = editData.nama.split(' ')[0].toLowerCase();

        // Ambil 2 digit terakhir dari angkatan
        const angkatanLast2 = editData.angkatan.length >= 2
            ? editData.angkatan.slice(-2)
            : editData.angkatan.padStart(2, '0');

        // Buat password
        const generatedPassword = `${firstName}${angkatanLast2}`;

        setEditData(prev => ({
            ...prev,
            password: generatedPassword,
            confirmPassword: generatedPassword
        }));

        showAlert('Password berhasil dibuat', 'success');
    };
    
    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>, action: (formData: FormData) => Promise<any>) => {
        event.preventDefault();
        setFormSubmitting(true);
        const formData = new FormData(event.currentTarget);
        const result = await action(formData);
        setFormSubmitting(false);

        if (result.type === 'success') {
            showAlert(result.message, 'success');
            fetchAlumni(); // Re-fetch data
            setEditMode(false);
            setAddMode(false);
        } else {
            showAlert(result.message, 'error');
        }
    };

    // Opsi angkatan dinamis berdasarkan filterProdi
    const angkatanOptionsForFilter = React.useMemo(() => {
        let angkatans: (number | null)[];
        if (filterProdi) {
            angkatans = alumniList
                .filter(alumni => alumni.prodi === filterProdi)
                .map(alumni => alumni.angkatan);
        } else {
            angkatans = alumniList.map(alumni => alumni.angkatan);
        }
        return Array.from(new Set(angkatans.filter(Boolean) as number[]))
            .sort((a, b) => b - a);
    }, [filterProdi, alumniList]);

    const filteredAlumni = alumniList.filter(alumni => {
        const searchMatch = searchTerm === '' ||
            alumni.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alumni.pekerjaan?.toLowerCase().includes(searchTerm.toLowerCase());

        const prodiMatch = filterProdi === '' || alumni.prodi === filterProdi;
        const angkatanMatch = filterAngkatan === '' || alumni.angkatan?.toString() === filterAngkatan;

        return searchMatch && prodiMatch && angkatanMatch;
    });

    return (
        <div className="min-h-screen theme-admin">
            <SidebarAdmin />
            <main className="ml-72 px-2 py-4 md:px-4 md:py-6 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto">
                <div className="w-full">
                    {/* Judul Utama - Hanya tampil jika tidak dalam mode edit atau tambah */}
                    {!(editMode || addMode) && (
                        <h1 className="text-2xl font-bold mb-6 text-foreground flex items-center">
                            <Users2Icon className="mr-3 w-6 h-6 text-primary" />
                            Manajemen Data Alumni
                        </h1>
                    )}

                    {alert.show && (
                        <div className={`mb-4 p-3 rounded flex items-center ${alert.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-destructive/20 text-destructive'}`}>
                            <AlertCircle className="w-5 h-5 mr-2" />
                            {alert.message}
                        </div>
                    )}

                    {/* Judul untuk Mode Tambah */}
                    {addMode && (
                        <div className="flex items-center"> {/* mb-1 dihapus untuk menghilangkan jarak */}
                            <button
                                onClick={() => {
                                    setAddMode(false);
                                }}
                                className="mr-3 p-2 rounded-md hover:bg-muted transition-colors"
                                title="Kembali ke daftar alumni"
                            >
                                <ArrowLeft className="w-6 h-6 text-foreground" />
                            </button>
                            <h2 className="text-xl font-bold text-foreground">Tambah Alumni</h2>
                        </div>
                    )}

                    {/* Judul untuk Mode Edit */}
                    {editMode && selectedAlumni && (
                        <div className="flex items-center"> {/* mb-1 dihapus untuk menghilangkan jarak */}
                            <button
                                onClick={() => {
                                    setEditMode(false);
                                    setSelectedAlumni(null);
                                }}
                                className="mr-3 p-2 rounded-md hover:bg-muted transition-colors"
                                title="Kembali ke daftar alumni"
                            >
                                <ArrowLeft className="w-6 h-6 text-foreground" />
                            </button>
                            <h2 className="text-xl font-bold text-foreground">Edit Data Alumni: {selectedAlumni.nama}</h2>
                        </div>
                    )}

                    <div className={`${(editMode || addMode) ? 'mt-4' : 'my-6'} flex flex-col md:flex-row justify-between items-center gap-4`}> {/* Kurangi margin jika dalam mode add/edit */}
                        {/* Sembunyikan search input dan tombol "Tambah Alumni" utama jika dalam mode tambah atau edit */}
                        {!(editMode || addMode) && (
                            <>
                                <div className="relative flex-grow w-full md:w-1/2 lg:w-1/3">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Cari alumni..."
                                        className="pl-10 pr-4 py-2 w-full border border-input rounded-md bg-background text-foreground focus:ring-ring focus:border-ring"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="flex w-full md:w-auto"> {/* Dibungkus flex agar layout tombol Tambah Alumni tetap konsisten */}
                                    <button
                                        onClick={startAdd}
                                        className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center hover:bg-primary/90 w-full md:w-auto justify-center"
                                    >
                                        <UserPlus className="w-5 h-5 mr-2" />
                                        Tambah
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Sembunyikan filter jika dalam mode tambah atau edit */}
                    {!(editMode || addMode) && (
                        <>
                            <div className="bg-card rounded-xl shadow-lg overflow-hidden mb-8">
                                <div className="bg-muted px-5 py-3 border-b border-border">
                                    <h3 className="text-base font-semibold text-card-foreground flex items-center">
                                        <Filter className="mr-2 h-5 w-5 text-muted-foreground" />
                                        Filter Data Alumni
                                    </h3>
                                </div>
                                <div className="px-5 py-4 space-y-5">
                                    <div>
                                        <label htmlFor="prodiFilterAlumni" className="block text-sm font-medium text-muted-foreground mb-1.5">Program Studi</label>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setFilterProdi('')}
                                                className={`px-3 py-1.5 text-sm font-medium rounded-md shadow-sm transition-colors duration-150 ease-in-out
                                                    ${filterProdi === ''
                                                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                                    }`}
                                            >
                                                Semua Prodi
                                            </button>
                                            {prodiOptions.map(prodi => (
                                                <button
                                                    key={prodi}
                                                    type="button"
                                                    onClick={() => setFilterProdi(prodi)}
                                                    className={`px-3 py-1.5 text-sm font-medium rounded-md shadow-sm transition-colors duration-150 ease-in-out
                                                        ${filterProdi === prodi
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
                                    {filterProdi && (
                                        <div>
                                            <label htmlFor="angkatanFilterAlumni" className="block text-sm font-medium text-muted-foreground mb-1.5">
                                                Angkatan (dari Prodi: {filterProdi})
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setFilterAngkatan('')}
                                                    className={`px-3 py-1.5 text-sm font-medium rounded-md shadow-sm transition-colors duration-150 ease-in-out
                                                        ${filterAngkatan === ''
                                                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                                }`}
                                                >
                                                    Semua Angkatan
                                                </button>
                                                {angkatanOptionsForFilter.map(angkatan => (
                                                    <button
                                                        key={angkatan}
                                                        type="button"
                                                        onClick={() => setFilterAngkatan(angkatan.toString())}
                                                        className={`px-3 py-1.5 text-sm font-medium rounded-md shadow-sm transition-colors duration-150 ease-in-out
                                                            ${filterAngkatan === angkatan.toString()
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
                        </>
                    )}


                    {(editMode || addMode) && (
                        <div className="relative mb-6 bg-card p-6 rounded-lg shadow text-card-foreground"> {/* mt-1 dihapus dari card form */}
                            {/* Tombol Refresh Data (Icon Only) di kanan atas form */}
                            <button
                                type="button"
                                onClick={() => {
                                    fetchAlumni(); // Muat ulang data list
                                    setEditMode(false); // Tutup form
                                    setAddMode(false);  // Tutup form
                                    showAlert('Data alumni telah dimuat ulang.', 'success');
                                }} // Fungsi tombol refresh tetap
                                className="absolute top-4 right-4 p-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80"
                                title="Muat Ulang Data Alumni dan Tutup Form"
                                disabled={formSubmitting}
                            >
                                <RefreshCw className="h-5 w-5" />
                            </button>
                            <form onSubmit={(e) => handleFormSubmit(e, editMode ? updateAlumniAction : addAlumniAction)} encType="multipart/form-data">
                                {editMode && <input type="hidden" name="id" value={editData.id} />}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-11"> {/* Jarak dikurangi lagi, mt-11 (2.75rem) */}
                                    {/* Email - Hanya saat addMode */}
                                    {addMode && (
                                        <div className="md:col-span-2"> {/* Email dibuat full width saat addMode */}
                                            <label className="block text-sm font-medium mb-1">Email</label>
                                            <input type="email" name="email" value={editData.email} onChange={handleInputChange} className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground" required={addMode} />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nama</label>
                                        <input type="text" name="nama" value={editData.nama} onChange={handleInputChange} className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Program Studi</label>
                                        <select name="prodi" value={editData.prodi} onChange={handleInputChange} className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground appearance-none">
                                            <option value="">-- Pilih Program Studi --</option>
                                            {prodiOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Angkatan</label>
                                        <input type="number" name="angkatan" value={editData.angkatan} onChange={handleInputChange} className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Pekerjaan</label>
                                        <input type="text" name="pekerjaan" value={editData.pekerjaan} onChange={handleInputChange} className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground" />
                                    </div>
                                    
                                    {/* Password fields - Hanya saat addMode */}
                                    {addMode && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Password Akun</label>
                                                <div className="flex">
                                                    <input
                                                        type="password"
                                                        name="password"
                                                        value={editData.password}
                                                        onChange={handleInputChange}
                                                        className="w-full border border-input rounded-l-md px-3 py-2 bg-background text-foreground"
                                                        required={addMode}
                                                    />
                                                    <button type="button" onClick={generatePassword} className="bg-muted border border-input px-3 rounded-r-md hover:bg-muted/80" title="Generate Password">
                                                        <KeyRound className="h-5 w-5 text-muted-foreground" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Konfirmasi Password</label>
                                                <input type="password" name="confirmPassword" value={editData.confirmPassword} onChange={handleInputChange} className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground" required={addMode} />
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="mt-6 flex flex-col sm:flex-row justify-end items-center"> {/* Tombol Batal dihilangkan, gap-2 dihapus jika hanya satu tombol */}
                                    <button type="submit" className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center" disabled={formSubmitting}>
                                        {formSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {editMode ? 'Simpan' : 'Tambah'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Sembunyikan tabel jika dalam mode tambah atau edit */}
                    {!(editMode || addMode) && (
                        <div className="bg-card rounded-lg shadow overflow-hidden">
                            {loading ? (
                                <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center justify-center"><Loader2 className="w-6 h-6 mb-3 animate-spin" /> Memuat data alumni...</div>
                            ) : filteredAlumni.length === 0 ? (
                                <div className="p-6 text-center text-muted-foreground text-xs">{searchTerm || filterProdi || filterAngkatan ? 'Tidak ada alumni yang sesuai dengan filter.' : 'Belum ada data alumni'}</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full divide-y divide-border table-auto">
                                        <thead className="bg-muted">
                                            <tr>
                                                <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider w-[25%]">Nama</th>
                                                <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider w-[20%]">Prodi</th>
                                                <th className="px-3 py-3 text-center text-sm font-medium text-muted-foreground uppercase tracking-wider w-[10%]">Angkatan</th>
                                                <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider w-[20%]">Pekerjaan</th>
                                                <th className="px-3 py-3 text-center text-sm font-medium text-muted-foreground uppercase tracking-wider w-[17%]">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-card divide-y divide-border">
                                            {filteredAlumni.map((alumni, index) => (
                                                <tr key={alumni.id} className={index % 2 !== 0 ? 'bg-muted/40' : ''}>
                                                    
                                                    <td className="px-3 py-2 text-sm text-left align-top">
                                                        <div className="truncate" title={alumni.nama}>{alumni.nama}</div>
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-muted-foreground text-left align-top truncate" title={alumni.prodi || undefined}>{alumni.prodi || '-'}</td>
                                                    <td className="px-3 py-2 text-sm text-muted-foreground text-center align-top truncate" title={alumni.angkatan?.toString() || undefined}>{alumni.angkatan || '-'}</td>
                                                    <td className="px-3 py-2 text-sm text-muted-foreground text-left align-top break-words" title={alumni.pekerjaan || undefined}>
                                                        {alumni.pekerjaan || '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm font-medium text-center align-top">
                                                        <button onClick={() => startEdit(alumni)} className="text-secondary hover:text-secondary/80 mr-3"><FileEdit className="h-4 w-4" /></button>
                                                        <button onClick={() => confirmDelete(alumni)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {showConfirmDelete && selectedAlumni && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full text-card-foreground">
                                <h3 className="text-lg font-semibold mb-4">Konfirmasi Penghapusan</h3>
                                <p className="mb-6 text-sm">Apakah Anda yakin ingin menghapus data alumni: <span className="font-semibold">{selectedAlumni.nama}</span>?</p>
                                <form onSubmit={(e) => handleFormSubmit(e, deleteAlumniAction)} className="flex justify-end">
                                    <input type="hidden" name="id" value={selectedAlumni.id} />
                                    {selectedAlumni.user_id && <input type="hidden" name="user_id" value={selectedAlumni.user_id} />}
                                    <button type="button" onClick={() => setShowConfirmDelete(false)} className="mr-2 px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 text-sm" disabled={formSubmitting}>Batal</button>
                                    <button type="submit" className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 text-sm flex items-center" disabled={formSubmitting}>
                                        {formSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Hapus
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}