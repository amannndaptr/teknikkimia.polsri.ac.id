'use client'

import { useState, useEffect } from 'react';
import SidebarAdmin from '@/components/SidebarAdmin'; // Import SidebarAdmin
import { AlertCircle, Edit3, Info, BarChart2, Settings, Calendar, CheckCircle, XCircle } from 'lucide-react'; // Import icons
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
            const { data: totalKompensasi, count: totalCount } = await supabase
                .from('kompensasi')
                .select('id', { count: 'exact', head: true });

            const { count: pendingCount } = await supabase
                .from('kompensasi')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending_admin_review');

            const { count: riwayatCount } = await supabase
                .from('kompensasi')
                .select('id', { count: 'exact', head: true })
                .in('status', ['admin_verified', 'admin_rejected']);

            setStats({
                totalEntries: totalCount || 0,
                pendingVerification: pendingCount || 0,
                verified: riwayatCount || 0
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-blue-500/10 rounded-lg border border-blue-500/30 text-blue-700 dark:text-blue-300 dark:bg-blue-500/5 dark:border-blue-500/20">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Total Entri Kompensasi</p>
                    <BarChart2 className="w-5 h-5 opacity-70" />
                </div>
                <p className="text-3xl font-bold mt-1">{stats.totalEntries}</p>
            </div>
            <div className="p-5 bg-yellow-500/10 rounded-lg border border-yellow-500/30 text-yellow-700 dark:text-yellow-300 dark:bg-yellow-500/5 dark:border-yellow-500/20">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Menunggu Verifikasi Admin</p>
                    <AlertCircle className="w-5 h-5 opacity-70" />
                </div>
                <p className="text-3xl font-bold mt-1">{stats.pendingVerification}</p>
            </div>
            <div className="p-5 bg-green-500/10 rounded-lg border border-green-500/30 text-green-700 dark:text-green-300 dark:bg-green-500/5 dark:border-green-500/20">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Sudah Diverifikasi</p>
                    <CheckCircle className="w-5 h-5 opacity-70" />
                </div>
                <p className="text-3xl font-bold mt-1">{stats.verified}</p>
            </div>
        </div>
    );
}

export default function InformasiKompensasiPage() {
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

    useEffect(() => {
        fetchKompenInfo();
    }, []);

    async function fetchKompenInfo() {
        setLoading(true);
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
            // TODO: Add user-facing error alert
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

            // Update state lokal setelah berhasil
            setKompenInfo(prev => ({
                ...prev,
                is_kompensasi_active: !prev.is_kompensasi_active
            }));
        } catch (error) {
            console.error('Error toggling compensation session:', error);
            // TODO: Add user-facing error alert
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
            setIsEditing(false); // Tutup mode edit setelah menyimpan
        } catch (error) {
            console.error('Error saving kompen info:', error);
            // TODO: Add user-facing error alert
        } finally {
            setLoading(false);
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setKompenInfo(prev => ({
            ...prev,
            [name]: value
        }));
    };

    if (loading && !kompenInfo.id) { // Tambahkan kondisi untuk loading awal
        return (
            <div className="min-h-screen theme-admin flex items-center justify-center bg-background">
                <SidebarAdmin />
                <main className="ml-72 flex-grow flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        Memuat informasi sesi kompensasi...
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen theme-admin">
            <SidebarAdmin />
            <main className="ml-72 px-4 py-4 md:px-6 md:py-6 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto"> {/* py dikurangi */}
                <div className="w-full max-w-5xl mx-auto">
                    <header className="mb-6">
                        <h1 className="text-2xl font-bold text-foreground flex items-center"> {/* Ukuran font diubah dari text-3xl menjadi text-2xl */}
                            <Settings className="mr-3 w-6 h-6 text-primary" />
                            Informasi Sesi Kompensasi
                        </h1>
                    </header>

                    {kompenInfo.is_kompensasi_active && (
                        <div className="bg-card rounded-xl shadow-lg p-4 mb-6 border border-border"> {/* p dan mb dikurangi */}
                            <DataSummary />
                        </div>
                    )}

                    <div className="bg-card rounded-xl shadow-lg p-4 mb-4 border border-border"> {/* p dan mb dikurangi */}
                        <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 pb-3 border-b border-border"> {/* mb dan pb dikurangi */}
                            <h2 className="text-xl font-semibold text-card-foreground flex items-center">
                                <Info className="mr-2 w-5 h-5 text-muted-foreground" />
                                Status dan Detail Sesi
                            </h2>
                            <div className="flex items-center mt-3 md:mt-0">
                                <div className={`w-3 h-3 rounded-full mr-2 ${kompenInfo.is_kompensasi_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <p className={`text-sm font-medium ${kompenInfo.is_kompensasi_active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{kompenInfo.is_kompensasi_active ? 'Sesi Aktif' : 'Sesi Tidak Aktif'}</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleKompenSession}
                            disabled={loading}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 mb-4 flex items-center {/* mb dikurangi */}
                                ${kompenInfo.is_kompensasi_active 
                                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' 
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90'} 
                                disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div> : (kompenInfo.is_kompensasi_active ? <XCircle className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />)}
                            {loading ? 'Memproses...' : kompenInfo.is_kompensasi_active ? 'Tutup Sesi Kompensasi' : 'Buka Sesi Kompensasi'}
                        </button>

                        {isEditing ? (
                            <form onSubmit={(e) => { e.preventDefault(); saveKompenInfo(); }}>
                                <div className="space-y-4"> {/* space-y dikurangi */}
                                    <div>
                                        <label htmlFor="nomor_surat" className="block text-sm font-medium text-muted-foreground mb-1">Nomor Surat</label>
                                        <input
                                            type="text"
                                            name="nomor_surat"
                                            id="nomor_surat"
                                            value={kompenInfo.nomor_surat || ""}
                                            required
                                            onChange={handleInputChange}
                                            className="mt-1 block w-full px-3 py-2 border border-input bg-background text-foreground rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2"> {/* gap-y dikurangi */}
                                        <div>
                                            <label htmlFor="semester" className="block text-sm font-medium text-muted-foreground mb-1">Semester</label>
                                    <select
                                        id="semester"
                                        name="semester"
                                        value={kompenInfo.semester}
                                        onChange={handleInputChange}
                                                className="mt-1 block w-full pl-3 pr-10 py-2 border border-input bg-background text-foreground focus:outline-none focus:ring-ring focus:border-ring sm:text-sm rounded-md h-[38px] appearance-none"
                                    >
                                        <option value="Ganjil">Ganjil</option>
                                        <option value="Genap">Genap</option>
                                    </select>
                                </div>
                                <div>
                                            <label htmlFor="tahun_ajaran" className="block text-sm font-medium text-muted-foreground mb-1">Tahun Ajaran</label>
                                    <input
                                        type="text"
                                        name="tahun_ajaran"
                                        id="tahun_ajaran"
                                        value={kompenInfo.tahun_ajaran || ""}
                                        onChange={handleInputChange}
                                        placeholder="Contoh: 2023/2024"
                                                className="mt-1 block w-full px-3 py-2 border border-input bg-background text-foreground rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
                                    />
                                </div>
                            </div>

                                    <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2"> {/* gap-y dikurangi */}
                                <div>
                                            <label htmlFor="kompensasi_start_date" className="block text-sm font-medium text-muted-foreground mb-1">Tanggal Mulai</label>
                                    <input
                                        type="datetime-local"
                                        name="kompensasi_start_date"
                                        id="kompensasi_start_date"
                                        value={kompenInfo.kompensasi_start_date || ""}
                                        onChange={handleInputChange}
                                                className="mt-1 block w-full px-3 py-2 border border-input bg-background text-foreground rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
                                    />
                                </div>
                                <div>
                                            <label htmlFor="kompensasi_end_date" className="block text-sm font-medium text-muted-foreground mb-1">Tanggal Selesai</label>
                                    <input
                                        type="datetime-local"
                                        name="kompensasi_end_date"
                                        id="kompensasi_end_date"
                                        value={kompenInfo.kompensasi_end_date || ""}
                                        onChange={handleInputChange}
                                                className="mt-1 block w-full px-3 py-2 border border-input bg-background text-foreground rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                                <div className="mt-4 pt-4 border-t border-border flex justify-end space-x-3"> {/* mt dan pt dikurangi */}
                                    <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-medium bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors duration-150">Batal</button>
                                    <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center">
                                        {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>}
                                        {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="mt-3"> {/* mt dikurangi */}
                                <dl className="space-y-2"> {/* space-y dikurangi */}
                                    {[
                                        { label: "Nomor Surat", value: kompenInfo.nomor_surat || <span className="italic text-muted-foreground/70">Belum diisi</span> },
                                        { label: "Semester", value: kompenInfo.semester },
                                        { label: "Tahun Ajaran", value: kompenInfo.tahun_ajaran },
                                        { 
                                            label: "Periode Kompensasi", 
                                            value: (
                                                <>
                                                    {kompenInfo.kompensasi_start_date ? 
                                                        `${new Date(kompenInfo.kompensasi_start_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` 
                                                        : '-'} 
                                                    <span className="mx-2 text-muted-foreground/70">s/d</span>
                                                    {kompenInfo.kompensasi_end_date ? 
                                                        `${new Date(kompenInfo.kompensasi_end_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` 
                                                        : '-'}
                                                </>
                                            )
                                        }
                                    ].map((item, index) => (
                                        <div key={item.label} className={`py-2 sm:grid sm:grid-cols-3 sm:gap-4 ${index > 0 ? 'border-t border-border' : ''}`}> {/* py dikurangi */}
                                            <dt className="text-sm font-medium text-muted-foreground">{item.label}</dt>
                                            <dd className="mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2">{item.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                                <div className="mt-4 pt-4 border-t border-border"> {/* mt dan pt dikurangi */}
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors duration-150 flex items-center"
                                    >
                                        <Edit3 className="w-4 h-4 mr-2" />
                                        Edit Informasi
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}