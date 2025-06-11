'use client'

import DosenPAManager from '@/components/admin/DosenPAManager'; // Impor komponen yang sudah dipindah
import AdminReviewKompensasi from '@/components/admin/AdminReviewKompensasi'; // Impor komponen baru
import AdminRiwayatValidasi from '@/components/admin/AdminRiwayatValidasi'; // Impor komponen baru
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface KompenInfo {
    id: string;
    is_kompensasi_active: boolean;
    kompensasi_start_date: string | null;
    kompensasi_end_date: string | null;
    semester: string;
    tahun_ajaran: string;
    nomor_surat: string;
}

interface Stats {
    totalEntries: number;
    pendingVerification: number;
    verified: number;
}

// Interface PengajuanKompensasi tidak lagi dibutuhkan di sini karena sudah dipindah ke komponen masing-masing
interface PengajuanKompensasi {
    id: string;
    kelas: string;
    id_sekretaris: string;
    nama_sekretaris?: string; // Akan di-join
    id_dosen_pa: string;
    nama_dosen_pa?: string; // Akan di-join
    status: string;
    created_at: string;
    updated_at: string | null; // Tambahkan properti updated_at
}

export default function AdminKompensasiPage() {
    const [kompenInfo, setKompenInfo] = useState<KompenInfo>({
        id: '',
        is_kompensasi_active: false,
        kompensasi_start_date: null,
        kompensasi_end_date: null,
        semester: 'Ganjil',
        tahun_ajaran: '2024/2025',
        nomor_surat: ''
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'info' | 'dosenpa' | 'review'>('info'); // Hapus 'riwayat' dari tipe
    const [riwayatRefreshTrigger, setRiwayatRefreshTrigger] = useState(0);

    useEffect(() => {
        // Fetch kompen info
        fetchKompenInfo();
    }, []);

    async function fetchKompenInfo() {
        try {
            const { data, error } = await supabase
                .from('kompen_info')
                .select('*')
                .single();

            if (error) throw error;

            if (data) {
                setKompenInfo(data);
            }
        } catch (error) {
            console.error('Error fetching kompen info:', error);
        } finally {
            setLoading(false);
        }
    }

    async function toggleKompenSession() {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('kompen_info')
                .update({ is_kompensasi_active: !kompenInfo.is_kompensasi_active })
                .eq('id', kompenInfo.id);

            if (error) throw error;

            setKompenInfo({
                ...kompenInfo,
                is_kompensasi_active: !kompenInfo.is_kompensasi_active
            });
        } catch (error) {
            console.error('Error toggling compensation session:', error);
        } finally {
            setLoading(false);
        }
    }

    async function saveKompenInfo() {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('kompen_info')
                .update({
                    kompensasi_start_date: kompenInfo.kompensasi_start_date,
                    kompensasi_end_date: kompenInfo.kompensasi_end_date,
                    semester: kompenInfo.semester,
                    tahun_ajaran: kompenInfo.tahun_ajaran,
                    nomor_surat: kompenInfo.nomor_surat
                })
                .eq('id', kompenInfo.id);

            if (error) throw error;
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving kompen info:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setKompenInfo({
            ...kompenInfo,
            [name]: value
        });
    };

    const handleReviewSuccess = () => {
        setRiwayatRefreshTrigger(prev => prev + 1); // Ubah state untuk memicu re-render AdminRiwayatValidasi
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Panel Admin Kompensasi</h1>
            </header>

            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                <button
                        className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm ${activeTab === 'info' ? 'border-blue-600 text-blue-700 bg-blue-50 rounded-t-md' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    onClick={() => setActiveTab('info')}
                >
                    Informasi Kompensasi
                </button>
                <button
                        className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm ${activeTab === 'dosenpa' ? 'border-blue-600 text-blue-700 bg-blue-50 rounded-t-md' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    onClick={() => setActiveTab('dosenpa')}
                >
                    Kelola Dosen PA
                </button>
                <button
                        className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm ${activeTab === 'review' ? 'border-blue-600 text-blue-700 bg-blue-50 rounded-t-md' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    onClick={() => setActiveTab('review')}
                >
                    Review Pengajuan
                </button>
                </nav>
            </div>

            {activeTab === 'info' && (
                <>
                {kompenInfo.is_kompensasi_active && (
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-semibold text-gray-700 mb-4">Ringkasan Data Kompensasi</h2> {/* Perbaikan typo */}
                            <DataSummary />
                        </div>
                    )}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 pb-4 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-700">Status dan Informasi Sesi Kompensasi</h2>
                            <div className="flex items-center mt-3 md:mt-0">
                                <div className={`w-3 h-3 rounded-full mr-2 ${kompenInfo.is_kompensasi_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <p className="text-sm font-medium">{kompenInfo.is_kompensasi_active ? 'Sesi Aktif' : 'Sesi Tidak Aktif'}</p>
                            </div>
                        </div>
                        <button // Tombol Buka/Tutup Sesi
                            onClick={toggleKompenSession}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-6 transition-colors duration-150"
                        >
                            {loading ? 'Memproses...' : kompenInfo.is_kompensasi_active ? 'Tutup Sesi Kompensasi' : 'Buka Sesi Kompensasi'}
                        </button>

                        {isEditing ? (
                            <form onSubmit={(e) => { e.preventDefault(); saveKompenInfo(); }}>
                                <div className="space-y-4"> {/* Mengurangi space-y */}
                                    <div>
                                        <label htmlFor="nomor_surat" className="block text-sm font-medium text-gray-700">Nomor Surat</label>
                                        <input
                                            type="text"
                                            name="nomor_surat"
                                            id="nomor_surat"
                                            value={kompenInfo.nomor_surat || ""}
                                            required
                                            onChange={handleInputChange}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2"> {/* Mengurangi gap-y */}
                                        <div>
                                            <label htmlFor="semester" className="block text-sm font-medium text-gray-700">Semester</label>
                                            <select
                                                id="semester"
                                                name="semester"
                                                value={kompenInfo.semester}
                                                onChange={handleInputChange}
                                                className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md h-[38px]" // Menyamakan tinggi dengan input
                                            >
                                                <option value="Ganjil">Ganjil</option>
                                                <option value="Genap">Genap</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="tahun_ajaran" className="block text-sm font-medium text-gray-700">Tahun Ajaran</label>
                                            <input
                                                type="text"
                                                name="tahun_ajaran"
                                                id="tahun_ajaran"
                                                value={kompenInfo.tahun_ajaran || ""}
                                                onChange={handleInputChange}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2"> {/* Mengurangi gap-y */}
                                        <div>
                                            <label htmlFor="kompensasi_start_date" className="block text-sm font-medium text-gray-700">Tanggal Mulai</label>
                                            <input
                                                type="datetime-local"
                                                name="kompensasi_start_date"
                                                id="kompensasi_start_date"
                                                value={kompenInfo.kompensasi_start_date || ""}
                                                onChange={handleInputChange}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="kompensasi_end_date" className="block text-sm font-medium text-gray-700">Tanggal Selesai</label>
                                            <input
                                                type="datetime-local"
                                                name="kompensasi_end_date"
                                                id="kompensasi_end_date"
                                                value={kompenInfo.kompensasi_end_date || ""}
                                                onChange={handleInputChange}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 pt-4 border-t border-gray-200 flex justify-end space-x-3"> {/* Mengurangi mt dan pt */}
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors duration-150"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                                    >
                                        {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="mt-4"> {/* Mengurangi mt */}
                                <dl className="space-y-2.5"> {/* Mengurangi space-y */}
                                    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4"> {/* Mengurangi py */}
                                        <dt className="text-sm font-medium text-gray-500">Nomor Surat</dt>
                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{kompenInfo.nomor_surat || <span className="italic text-gray-400">Belum diisi</span>}</dd>
                                    </div>
                                    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4 border-t border-gray-100">
                                        <dt className="text-sm font-medium text-gray-500">Semester</dt>
                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{kompenInfo.semester}</dd>
                                    </div>
                                    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4 border-t border-gray-100">
                                        <dt className="text-sm font-medium text-gray-500">Tahun Ajaran</dt>
                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{kompenInfo.tahun_ajaran}</dd>
                                    </div>
                                    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4 border-t border-gray-100">
                                        <dt className="text-sm font-medium text-gray-500">Periode Kompensasi</dt>
                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                            {kompenInfo.kompensasi_start_date ? 
                                                `${new Date(kompenInfo.kompensasi_start_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}` 
                                                : '-'} 
                                            <span className="mx-2 text-gray-400">s/d</span>
                                            {kompenInfo.kompensasi_end_date ? 
                                                `${new Date(kompenInfo.kompensasi_end_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}` 
                                                : '-'}
                                        </dd>
                                    </div>
                                </dl>
                                <div className="mt-5 pt-4 border-t border-gray-200"> {/* Mengurangi mt dan pt */}
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-150"
                                    >
                                        Edit Informasi
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'dosenpa' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Manajemen Dosen PA per Kelas</h2>
                    <DosenPAManager />
                </div>
            )}

            {activeTab === 'review' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Review Pengajuan Kompensasi dari Sekretaris</h2>
                    <AdminReviewKompensasi onReviewSuccess={handleReviewSuccess} /> {/* Tambahkan prop onReviewSuccess */}
                    <hr className="my-8 border-gray-200" /> {/* Pemisah visual */}
                    <h2 className="text-xl font-semibold text-gray-700 mb-4 mt-6">Riwayat Validasi Pengajuan Kompensasi</h2>
                    <AdminRiwayatValidasi key={riwayatRefreshTrigger} /> {/* Tambahkan key prop */}
                </div> 
            )}
        </div>
    );
}

function DataSummary() {
    const [stats, setStats] = useState<Stats>({
        totalEntries: 0,
        pendingVerification: 0,
        verified: 0
    });
    const [loadingStats, setLoadingStats] = useState(true);
    useEffect(() => {
        fetchStats();
    }, []);

    async function fetchStats() {
        try {
            // Total Entri Kompensasi: Hitung jumlah pengajuan (per kelas)
            const { data: totalKompensasi } = await supabase
                .from('kompensasi')
                .select('id', { count: 'exact' });

            // Menunggu Verifikasi Admin: Hitung pengajuan dengan status 'pending_admin_review'
            const { data: pendingReview } = await supabase
                .from('kompensasi')
                .select('id', { count: 'exact' })
                .eq('status', 'pending_admin_review');

            // Sudah Diverifikasi: Hitung pengajuan dengan status 'admin_verified' atau 'admin_rejected'
            const { data: riwayatValidasi } = await supabase
                .from('kompensasi')
                .select('id', { count: 'exact' })
                .in('status', ['admin_verified', 'admin_rejected']);

            setStats({
                totalEntries: totalKompensasi ? totalKompensasi.length : 0, // Atau totalKompensasi?.length || 0, tergantung Supabase
                pendingVerification: pendingReview ? pendingReview.length : 0, // Sama seperti di atas
                verified: riwayatValidasi ? riwayatValidasi.length : 0
                // Perbaikan: Menggunakan .length untuk menghitung jumlah data
                // totalEntries: entries?.length || 0, 
                // pendingVerification: pending?.[0]?.count || 0,
                // verified: verified?.[0]?.count || 0
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoadingStats(false);
        }
    }

    if (loadingStats) {
        return <div className="text-center py-4 text-gray-500">Memuat ringkasan data...</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-700">Total Entri Kompensasi</p>
                <p className="text-3xl font-bold text-blue-800 mt-1">{stats.totalEntries}</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-yellow-700">Menunggu Verifikasi Admin</p>
                <p className="text-3xl font-bold text-yellow-800 mt-1">{stats.pendingVerification}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-700">Sudah Diverifikasi</p>
                <p className="text-3xl font-bold text-green-800 mt-1">{stats.verified}</p>
            </div>
        </div>
    );
}