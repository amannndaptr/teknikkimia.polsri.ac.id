'use client'

import SidebarDosen from '@/components/SidebarDosen'; // Impor SidebarDosen
import { useState, useEffect, useCallback } from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline'; // Impor ikon
import { createClient } from '@/utils/supabase/client';
// Import types from your types file
import {
    Student,
    RekapKehadiran,
    Kompensasi,
    KompenInfo,
    DosenPA,
    BatchActionStatus
} from './types/index';

const supabase = createClient();

// Interface for combining Kompensasi batch with related data for display
interface KompensasiBatchView extends Kompensasi {
    sekretaris_nama: string;
    jumlah_mahasiswa?: number;
}

// Interface for student details within a batch view
interface RekapDetailView extends RekapKehadiran {
    mahasiswa_nama: string;
    mahasiswa_nim: string;
}

export default function AdminVerificationPage() {
    const [dosenPA, setDosenPA] = useState<DosenPA | null>(null);
    const [allBatches, setAllBatches] = useState<KompensasiBatchView[]>([]);
    const [selectedBatch, setSelectedBatch] = useState<KompensasiBatchView | null>(null); // Tetap ada
    const [selectedBatchDetails, setSelectedBatchDetails] = useState<RekapDetailView[]>([]);
    // const [loadingUser, setLoadingUser] = useState<boolean>(true); // Digantikan oleh userAccessStatus
    const [loadingBatches, setLoadingBatches] = useState<boolean>(false);
    const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
    const [actionStatus, setActionStatus] = useState<BatchActionStatus>({ status: 'idle', message: '' });
    const [rejectionNote, setRejectionNote] = useState<string>('');

    const [userAccessStatus, setUserAccessStatus] = useState<'loading' | 'allowed' | 'not_pa' | 'profile_error' | 'auth_error'>('loading');

    // Fetch all Kompensasi batches assigned to this Dosen PA
    const fetchAllBatches = useCallback(async (dosenId: string) => {
        if (!dosenId) return;
        setLoadingBatches(true);
        setAllBatches([]);
        setSelectedBatchDetails([]);
        try {
            const { data: batches, error } = await supabase
                .from('kompensasi')
                .select(`
                    *,
                    mahasiswa:id_sekretaris ( nama )
                `)
                .eq('id_dosen_pa', dosenId)
                .order('created_at', { ascending: false }); // Show newest first

            if (error) throw error;
            
            // Handle case where batches might be null or undefined, even if no error
            if (!batches) {
                setAllBatches([]);
            } else {
            // Enhance batch data with secretary name
            const enhancedBatches = batches?.map(batch => ({
                ...batch,
                sekretaris_nama: batch.mahasiswa?.nama || 'Tidak diketahui'
            })) || [];
            setAllBatches(enhancedBatches);
            }
        } catch (error) {
            console.error("Error fetching batches:", error);
            setActionStatus({ status: 'error', message: `Gagal memuat daftar pengajuan: ${(error instanceof Error ? error.message : String(error))}` });
        } finally {
            setLoadingBatches(false);
        }
    }, []);

    // Fetch logged-in Dosen PA data
    const fetchDosenData = useCallback(async () => {
        setUserAccessStatus('loading');
        setDosenPA(null); // Reset DosenPA state
        setActionStatus({ status: 'idle', message: '' }); // Reset action status

        try {
            // Step 1: Get authenticated user
            const { data: authSessionData, error: authError } = await supabase.auth.getUser();

            if (authError || !authSessionData?.user) {
                console.error("Supabase authentication error:", authError);
                setUserAccessStatus('auth_error');
                setActionStatus({ status: 'error', message: authError?.message || "Autentikasi gagal. Tidak ada data pengguna." });
                return;
            }
            const authUser = authSessionData.user;

            if (!authUser.email) {
                setUserAccessStatus('auth_error');
                setActionStatus({ status: 'error', message: "Email pengguna tidak ditemukan setelah autentikasi." });
                return;
            }

            // Step 2: Get Dosen PA details
            const { data: dosenData, error: dosenError } = await supabase
                .from('dosen')
                .select('*')
                .eq('email', authUser.email)
                .single();
            
            if (dosenError) {
                console.error("Supabase Dosen profile fetch error:", dosenError);
                setUserAccessStatus('profile_error');
                let msg = `Gagal mengambil profil dosen: ${dosenError.message}.`;
                // PGRST116 is PostgREST error for "Searched for one row but found 0" or "Searched for one row but found N"
                if (dosenError.code === 'PGRST116') { 
                     msg = `Profil dosen untuk email '${authUser.email}' tidak ditemukan atau tidak unik di sistem.`;
                }
                setActionStatus({ status: 'error', message: msg });
                return;
            }

            if (!dosenData) {
                // This case should ideally be caught by dosenError with .single(), but as a safeguard
                setUserAccessStatus('profile_error');
                setActionStatus({ status: 'error', message: "Profil dosen tidak ditemukan (data kosong tanpa error dari Supabase)." });
                return;
            }

            // Step 3: Check if Dosen is a PA for any class in 'kelas_dosen_pa'
            if (dosenData.id_dsn && typeof dosenData.id_dsn === 'string' && dosenData.id_dsn.trim() !== '') {
                const { data: paKelasData, error: paKelasError } = await supabase
                    .from('kelas_dosen_pa')
                    .select('id') // We only need to check for existence
                    .eq('id_dosen_pa', dosenData.id_dsn)
                    .limit(1);

                if (paKelasError) {
                    console.error("Error checking kelas_dosen_pa:", paKelasError);
                    setUserAccessStatus('profile_error');
                    setActionStatus({ status: 'error', message: `Gagal memverifikasi status Dosen PA Kelas: ${paKelasError.message}` });
                    return;
                }

                if (paKelasData && paKelasData.length > 0) {
                    // Dosen is found in kelas_dosen_pa, allow access
                    setDosenPA(dosenData as DosenPA);
                    setUserAccessStatus('allowed');
                    fetchAllBatches(dosenData.id_dsn);
                } else {
                    // Dosen is valid, but not listed as PA for any class in kelas_dosen_pa
                    setUserAccessStatus('not_pa');
                    setActionStatus({ status: 'info', message: 'Maaf, Anda tidak dapat mengakses halaman ini karena Anda bukan Dosen PA.' });
                }
            } else {
                // id_dsn is invalid or missing from dosenData
                setUserAccessStatus('not_pa');
                setActionStatus({ 
                    status: 'error', 
                    message: 'Data ID Dosen (id_dsn) tidak valid atau tidak ditemukan pada profil Anda. Tidak dapat memverifikasi status Dosen PA.' 
                });
            }
        } catch (error) {
            console.error("Unexpected error in fetchDosenData:", error);
            setUserAccessStatus('profile_error'); // Or a more generic error state
            const displayMessage = error instanceof Error ? error.message : String(error);
            setActionStatus({ status: 'error', message: `Terjadi kesalahan tidak terduga saat memuat data: ${displayMessage}` });
        }
    }, [fetchAllBatches]); // Added fetchAllBatches as it's called within this useCallback

    // Fetch details for the selected batch
    const fetchBatchDetails = async (batchId: string) => {
        if (!batchId) return;
        setLoadingDetails(true);
        setSelectedBatchDetails([]);
        setActionStatus({ status: 'idle', message: '' });
        setRejectionNote('');
        try {
            const { data: details, error } = await supabase
                .from('rekap_kehadiran')
                .select(`
                    *,
                    mahasiswa:id_mhs ( nim, nama )
                `)
                .eq('id_kompensasi', batchId)
                .order('mahasiswa(nama)', { ascending: true });

            if (error) throw error;

            const enhancedDetails = details?.map(detail => ({
                ...detail,
                mahasiswa_nama: detail.mahasiswa?.nama || 'Nama tidak ditemukan',
                mahasiswa_nim: detail.mahasiswa?.nim || 'NIM tidak ditemukan'
            })) || [];
            setSelectedBatchDetails(enhancedDetails);
        } catch (error) {
            console.error("Error fetching batch details:", error);
            setActionStatus({ status: 'error', message: `Gagal memuat detail mahasiswa: ${(error instanceof Error ? error.message : String(error))}` });
        } finally {
            setLoadingDetails(false);
        }
    };
    // Handle selecting a batch from the list
    const handleSelectBatch = (batch: KompensasiBatchView) => {
        setSelectedBatch(batch);
        fetchBatchDetails(batch.id);
    };

    // Handle verification or rejection action
    const handleVerificationAction = async (batchId: string, newStatus: 'verified' | 'rejected') => {
        if (!dosenPA) return;

        if (newStatus === 'rejected' && !rejectionNote.trim()) {
            setActionStatus({ status: 'error', message: 'Catatan penolakan wajib diisi jika menolak pengajuan.' });
            return;
        }

        setActionStatus({ status: 'info', message: `Memproses ${newStatus === 'verified' ? 'verifikasi' : 'penolakan'}...` });

        try {
            const { error } = await supabase
                .from('kompensasi')
                .update({
                    status: newStatus,
                    catatan_dosen: newStatus === 'rejected' ? rejectionNote.trim() : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', batchId)
                .eq('id_dosen_pa', dosenPA.id_dsn);

            if (error) throw error;

            setActionStatus({ status: 'success', message: `Pengajuan berhasil di-${newStatus === 'verified' ? 'verifikasi' : 'tolak'}.` });

            // Refresh all batches and update selected batch
            fetchAllBatches(dosenPA.id_dsn);
            setSelectedBatch(null);
            setSelectedBatchDetails([]);
            setRejectionNote('');

            // Auto-clear success message
            setTimeout(() => setActionStatus(prev => prev.status === 'success' ? { status: 'idle', message: '' } : prev), 3000);

        } catch (error) {
            console.error(`Error during ${newStatus} action:`, error);
            setActionStatus({ status: 'error', message: `Gagal memproses ${newStatus === 'verified' ? 'verifikasi' : 'penolakan'}. ${(error instanceof Error ? error.message : String(error))}` });
        }
    };

    useEffect(() => {
        fetchDosenData();
    }, [fetchDosenData]);

    // Helper function to get status badge style
    const getStatusBadgeStyle = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'verified':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'rejected':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'completed':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };
    // Helper function to display status in Indonesian
    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Menunggu';
            case 'verified': return 'Diverifikasi';
            case 'rejected': return 'Ditolak';
            case 'completed': return 'Selesai';
            default: return status;
        }
    };

    if (userAccessStatus === 'loading') {
        return (
            <div className="flex min-h-screen bg-[#D1D9E6]">
                <SidebarDosen />
                <main className="flex-1 p-4 md:p-6 flex items-center justify-center">
                    <div className="text-center text-gray-700">Memuat data pengguna...</div>
                </main>
            </div>
        );
    }

    if (userAccessStatus === 'not_pa') {
        return (
            <div className="flex min-h-screen bg-[#D1D9E6]">
                <SidebarDosen />
                <main className="flex-1 p-4 md:p-6 flex items-center justify-center">
                    {/* Konsisten dengan halaman penelitian-pengabdian */}
                    <div className="container mx-auto p-6 flex flex-col justify-center items-center h-full">
                        <h1 className="text-2xl font-semibold mb-4 text-amber-700">Akses Ditolak</h1>
                        <div className="bg-[#BAC3D0] border-gray-400 w-full max-w-md p-6 rounded-lg shadow-md">
                            <p className="text-center text-gray-700">
                                {actionStatus.message || "Maaf, Anda tidak terdaftar sebagai Dosen Pembimbing Akademik untuk kelas manapun yang relevan dengan monitoring kompensasi, atau data dosen Anda tidak lengkap."}
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }
    if (userAccessStatus === 'auth_error' || userAccessStatus === 'profile_error' || !dosenPA) {
        return (
            <div className="flex min-h-screen bg-[#D1D9E6]">
                <SidebarDosen />
                <main className="flex-1 p-4 md:p-6 flex items-center justify-center">
                    {/* Konsisten dengan halaman penelitian-pengabdian */}
                    <div className="container mx-auto p-6 flex flex-col justify-center items-center h-full">
                        <h1 className="text-2xl font-semibold mb-4 text-red-700">Terjadi Kesalahan</h1>
                        <div className="bg-[#BAC3D0] border-gray-400 w-full max-w-md p-6 rounded-lg shadow-md">
                            <p className="text-center text-gray-700">
                                {actionStatus.message || "Tidak dapat memuat data Anda. Pastikan Anda telah login dan profil dosen Anda terkonfigurasi dengan benar."}
                            </p>
                            <p className="text-sm text-gray-500 mt-4 text-center">
                                Silakan coba lagi nanti atau hubungi administrator jika masalah berlanjut.
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // Render main content if userAccessStatus === 'allowed' and dosenPA is available
    return (
        <div className="flex min-h-screen bg-[#D1D9E6]"> {/* Ubah background utama halaman */}
            <SidebarDosen />
            <main className="flex-1 p-4 md:p-6">
                {/* Judul dan paragraf pengantar dipindahkan ke luar card */}
                <div className="max-w-6xl mx-auto">
                        <div className="flex items-center mb-2 border-b pb-2"> {/* Menyesuaikan dengan gaya di halaman upload */}
                        <DocumentTextIcon className="h-6 w-6 mr-2 text-gray-700" /> {/* Tambahkan ikon di sini */}
                            <h1 className="text-xl md:text-2xl font-bold text-gray-700">Monitoring Kompensasi</h1>
                    </div>
                        <p className="mt-1 mb-6 text-gray-600"> {dosenPA.nama}, Anda dapat memonitoring kompensasi dari kelas yang Anda bimbing.</p> {/* Menyesuaikan margin */}
                </div>

                <div className="max-w-6xl mx-auto bg-[#D1D9E6] p-6 rounded-lg shadow"> {/* Card utama untuk konten */}
                    {/* Display Action Status */}
                    {actionStatus.status !== 'idle' && actionStatus.status !== 'info' && (
                        <div className={`mb-4 px-4 py-3 rounded text-sm border ${actionStatus.status === 'success' ? 'bg-green-50 text-green-800 border-green-200' :
                                actionStatus.status === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
                                    'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                            {actionStatus.message}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Status Filter and List Column */}
                        <div className="md:col-span-1">
                            {/* Batch List */}
                            {loadingBatches ? (
                                <p className="text-gray-500">Memuat daftar pengajuan...</p>
                            ) : allBatches.length === 0 ? (
                                <p className="text-gray-500 italic">Tidak ada pengajuan ditemukan.</p>
                            ) : (
                                <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                                    {allBatches.map((batch: KompensasiBatchView) => (
                                        <li key={batch.id}>
                                            <button
                                                onClick={() => handleSelectBatch(batch)}
                                                className={`w-full text-left p-3 rounded border transition-colors duration-150 ${selectedBatch?.id === batch.id
                                                        ? 'bg-blue-100 border-blue-300 ring-1 ring-blue-300'
                                                        : 'bg-[#BAC3D0] border-gray-400 hover:bg-gray-300' 
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="font-medium text-gray-800">Kelas: {batch.kelas ?? 'N/A'}</p> {/* Juga amankan batch.kelas */}
                                                    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusBadgeStyle(batch.status ?? 'unknown')}`}>
                                                        {getStatusLabel(batch.status ?? 'unknown')}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500">Semester: {batch.semester} / {batch.tahun_ajaran}</p>
                                                <p className="text-xs text-gray-500">Diajukan: {batch.sekretaris_nama}</p>
                                                <p className="text-xs text-gray-500">Tanggal: {new Date(batch.created_at).toLocaleDateString('id-ID')}</p>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Detail Column */}
                        <div className="md:col-span-2">
                            <h2 className="text-lg font-semibold mb-3 text-gray-700">Detail Rekap Kehadiran</h2>
                            {selectedBatch ? (
                                <div className="bg-[#BAC3D0] p-4 border border-gray-400 rounded shadow-md"> 
                                    <div className="mb-4 pb-4 border-b border-gray-200">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-base font-semibold text-gray-800">Kelas: {selectedBatch.kelas ?? 'N/A'}</h3>
                                            <span className={`text-xs px-2 py-1 rounded-full border ${getStatusBadgeStyle(selectedBatch.status ?? 'unknown')}`}>
                                                {getStatusLabel(selectedBatch.status ?? 'unknown')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">Semester: {selectedBatch.semester} / {selectedBatch.tahun_ajaran}</p>
                                        <p className="text-sm text-gray-600">Diajukan oleh: {selectedBatch.sekretaris_nama}</p>
                                        <p className="text-sm text-gray-600">Tanggal Pengajuan: {new Date(selectedBatch.created_at).toLocaleString('id-ID')}</p>

                                        {/* Show rejection notes if available */}
                                        {selectedBatch.status === 'rejected' && selectedBatch.catatan_dosen && (
                                            <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded">
                                                <p className="text-sm font-medium text-red-700">Alasan Penolakan:</p>
                                                <p className="text-sm text-red-600">{selectedBatch.catatan_dosen}</p>
                                            </div>
                                        )}
                                    </div>

                                    {loadingDetails ? (
                                        <p className="text-gray-500">Memuat detail mahasiswa...</p>
                                    ) : selectedBatchDetails.length === 0 ? (
                                        <p className="text-gray-500 italic">Tidak ada detail mahasiswa ditemukan untuk pengajuan ini.</p>
                                    ) : (
                                        <>
                                            <h4 className="text-md font-semibold mb-2 text-gray-700">Daftar Mahasiswa:</h4>
                                            <div className="overflow-x-auto max-h-96 border rounded">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-100 sticky top-0">
                                                        <tr>
                                                            <th className="p-2 text-left font-medium text-gray-600">NIM</th>
                                                            <th className="p-2 text-left font-medium text-gray-600">Nama</th>
                                                            <th className="p-2 text-right font-medium text-gray-600">Menit Tidak Hadir</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {selectedBatchDetails.map(detail => (
                                                            <tr key={detail.id} className="hover:bg-gray-50">
                                                                <td className="p-2 whitespace-nowrap">{detail.mahasiswa_nim}</td>
                                                                <td className="p-2 whitespace-nowrap">{detail.mahasiswa_nama}</td>
                                                                <td className="p-2 text-right whitespace-nowrap">{detail.menit_tidak_hadir} Menit</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Only show action area for pending submissions */}
                                            {selectedBatch.status === 'pending' && (
                                                <div className="mt-6 pt-4 border-t border-gray-200">
                                                    <h4 className="text-md font-semibold mb-2 text-gray-700">Tindakan Verifikasi</h4>
                                                    {/* Rejection Note Input */}
                                                    <div className="mb-4">
                                                        <label htmlFor="rejectionNote" className="block text-sm font-medium text-gray-700 mb-1">
                                                            Catatan (Wajib diisi jika menolak):
                                                        </label>
                                                        <textarea
                                                            id="rejectionNote"
                                                            rows={3}
                                                            value={rejectionNote}
                                                            onChange={(e) => setRejectionNote(e.target.value)}
                                                            className="w-full p-2 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            placeholder="Berikan alasan jika pengajuan ditolak..."
                                                        />
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex flex-wrap gap-3">
                                                        <button
                                                            onClick={() => handleVerificationAction(selectedBatch.id, 'verified')}
                                                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out"
                                                        >
                                                            Verifikasi Pengajuan
                                                        </button>
                                                        <button
                                                            onClick={() => handleVerificationAction(selectedBatch.id, 'rejected')}
                                                            disabled={!rejectionNote.trim()}
                                                            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title={!rejectionNote.trim() ? "Isi catatan untuk menolak" : "Tolak pengajuan ini"}
                                                        >
                                                            Tolak Pengajuan
                                                        </button>
                                                    </div>

                                                    {/* Display info/loading message during action */}
                                                    {actionStatus.status === 'info' && (
                                                        <p className="mt-3 text-sm text-blue-600">{actionStatus.message}</p>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-[#BAC3D0] p-4 border border-gray-400 rounded shadow-md text-center text-gray-500"> 
                                    Pilih pengajuan dari daftar di samping untuk melihat detail.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}