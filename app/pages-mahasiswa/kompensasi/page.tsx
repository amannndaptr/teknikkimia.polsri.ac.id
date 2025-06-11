'use client'

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Student, RekapKehadiran, Kompensasi, KompenInfo } from './types/index';
import { FiRefreshCw } from 'react-icons/fi'; // Impor ikon refresh
import Link from 'next/link';
import SidebarMahasiswa from '@/components/SidebarMahasiswa'; // Impor SidebarMahasiswa

const supabase = createClient();

// Define clear types for status tracking
type StatusType = 'idle' | 'success' | 'error' | 'info';
interface StatusMessage {
    status: StatusType;
    message: string;
}

export default function MahasiswaKompensasiPage() {
    const [user, setUser] = useState<Student | null>(null);
    const [classmates, setClassmates] = useState<Student[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isSecretary, setIsSecretary] = useState<boolean>(false);
    const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
    const [kompenInfo, setKompenInfo] = useState<KompenInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [classKompensasi, setClassKompensasi] = useState<Kompensasi | null>(null); // For class-wide status for all members

    useEffect(() => {
        checkUserAndLoadData();
    }, []);

    async function checkUserAndLoadData() {
        setLoading(true);
        setError(null);
        // Reset states that might be specific to secretary or previous loads
        setIsSecretary(false);
        setIsSessionActive(false);
        setKompenInfo(null);
        setClassKompensasi(null);
        setClassmates([]);

        try {
            // Get authenticated user
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

            if (authError) throw new Error(`Authentication error: ${authError.message}`);
            if (!authUser) {
                setError('Silakan login terlebih dahulu');
                setLoading(false);
                return;
            }

            // Get student details
            const { data: student, error: studentError } = await supabase
                .from('mahasiswa')
                .select('*')
                .eq('id_mhs', authUser.id)
                .maybeSingle(); // Changed from .single() to .maybeSingle()

            if (studentError) throw new Error(`Error fetching student data: ${studentError.message}`);
            if (!student) {
                setError('Data mahasiswa tidak ditemukan');
                setLoading(false);
                return;
            }

            setUser(student);
            const isUserSecretaryCurrent = student.jabatan_kelas === 'Sekretaris';
            setIsSecretary(isUserSecretaryCurrent);

            // If not secretary, stop further data loading for kompensasi.
            // The UI block `if (user && !isSecretary)` will handle the specific display.
            if (!isUserSecretaryCurrent) {
                setLoading(false);
                return;
            }

            // For secretary, proceed to load session info, classmates, etc.
            // Load session info
            const { data: settings, error: settingsError } = await supabase
                .from('kompen_info') // Pastikan nama tabel ini benar
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is ok
                throw new Error(`Error fetching session settings: ${settingsError.message}`);
            }

            if (settings) {
                setIsSessionActive(settings.is_kompensasi_active || false);
                setKompenInfo(settings);
            } else {
                setIsSessionActive(false);
            }

            // Load classmates for the secretary
            // This check is implicitly true if we've reached this point
                const { data: classmatesData, error: classmatesError } = await supabase
                    .from('mahasiswa')
                    .select('*')
                    .eq('kelas', student.kelas)
                    .order('nama');

                if (classmatesError) throw new Error(`Error fetching classmates: ${classmatesError.message}`);
                setClassmates(classmatesData || []);

            // Fetch class kompensasi status for the secretary's class
            if (student && settings) { // isUserSecretaryCurrent is implied
                const { data: kompData, error: kompError } = await supabase
                    .from('kompensasi')
                    .select('*')
                    .eq('kelas', student.kelas)
                    // Optionally scope to current session if semester/tahun_ajaran are reliable in kompen_info and kompensasi
                    // .eq('semester', settings.semester) 
                    // .eq('tahun_ajaran', settings.tahun_ajaran)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (kompError && kompError.code !== 'PGRST116') { // PGRST116: no rows found, which is fine
                    console.warn('Warning fetching class kompensasi status:', kompError.message);
                }
                if (kompData) setClassKompensasi(kompData);
            }

        } catch (error) {
            console.error('Error loading data:', error);
            setError(error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="p-4 text-center">Memuat data...</div>;
        // Jika ingin loading screen full page dengan tema mahasiswa:
        // return (
        //     <div className="flex min-h-screen theme-mahasiswa"> {/* Gunakan kelas tema mahasiswa */}
        //         <SidebarMahasiswa />
        //         <main className="flex-1 p-6 text-center bg-blue-50 ml-72">Memuat data...</main>
        //         Memuat data...
        //     </div>
        // );
    }

    if (error) {
        return (
            <div className="flex min-h-screen theme-mahasiswa">
                <SidebarMahasiswa />
                <main className="flex-1 p-4 sm:p-6 md:p-8 flex items-center justify-center bg-blue-50 ml-72">
                    <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-lg border border-red-200">
                        <div className="bg-red-100 border border-red-200 p-4 rounded">
                            <p className="text-red-700 font-semibold">Error</p>
                            <p className="text-red-600">{error}</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // Display specific "Access Denied" card for non-secretaries
    if (user && !isSecretary) { 
        return (
            <div className="flex min-h-screen theme-mahasiswa">
                <SidebarMahasiswa />
                <main className="flex-1 p-4 sm:p-6 md:p-8 flex items-center justify-center ml-72 bg-blue-50">
                    {/* Styled card for non-secretary access denial */}
                    <div className="container mx-auto p-6 flex flex-col justify-center items-center h-full max-w-md">
                        <h1 className="text-2xl font-semibold mb-4 text-amber-700">Akses Ditolak</h1>
                        <div className="bg-[#BAC3D0] border-gray-400 w-full p-6 rounded-lg shadow-md">
                            <p className="text-center text-gray-700">
                                Fitur kompensasi hanya dapat diakses oleh Sekretaris Kelas.
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // This check is now only relevant for secretaries.
    if (isSecretary && !isSessionActive) {
        return (
            <div className="flex min-h-screen theme-mahasiswa">
                <SidebarMahasiswa />
                <main className="flex-1 p-4 sm:p-6 md:p-8 bg-blue-50 ml-72">
                    <div className="p-4 max-w-4xl mx-auto bg-white rounded-lg shadow-lg border border-blue-200">
                        <div className="bg-yellow-100 border border-yellow-300 p-4 rounded">
                            <p className="text-yellow-800 font-semibold">Informasi</p>
                            <p className="text-yellow-700">Sesi kompensasi belum dibuka atau sudah berakhir.</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // Render Secretary View only if user is secretary and session is active
    if (isSecretary && isSessionActive) { return (
        <div className="flex min-h-screen theme-mahasiswa">
            <SidebarMahasiswa />
            <main className="flex-1 p-4 sm:p-6 md:p-8 bg-blue-50 ml-72"> {/* Konten utama halaman */}
                <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-lg border border-blue-200">
                    <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">Sistem Kompensasi Kelas {user?.kelas}</h1>

                    {kompenInfo && (
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-6 shadow-sm">
                            <h2 className="font-semibold mb-2 text-blue-800">Informasi Sesi Kompensasi</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
                                <div>
                                    <p className="text-gray-500">Periode Sesi</p>
                                    <p className="font-medium">
                                        {kompenInfo.kompensasi_start_date ? new Date(kompenInfo.kompensasi_start_date).toLocaleDateString('id-ID') : '-'}
                                        s/d
                                        {kompenInfo.kompensasi_end_date ? new Date(kompenInfo.kompensasi_end_date).toLocaleDateString('id-ID') : '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Semester & Tahun Ajaran</p>
                                    <p className="font-medium">{kompenInfo.semester || '-'} {kompenInfo.tahun_ajaran || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Nomor Surat (Ref)</p>
                                    <p className="font-medium">{kompenInfo.nomor_surat || '-'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pass user and classmates to the view */}
                    {user && <SecretaryView user={user} classmates={classmates} kompenInfo={kompenInfo} />}
                </div>
            </main>
        </div>
    );}

    // Fallback or if somehow isSecretary is true but session is not active (already handled),
    // or other unexpected states. The error state should ideally catch most issues.
    return null; 

}

// Helper functions for non-secretary view
function getNonSecretaryStatusText(status: string | null | undefined): string {
    if (!status) return 'Belum Diajukan';
    switch (status) {
        case 'pending_admin_review': return 'Menunggu Review Admin'; // Yellowish
        case 'admin_verified': return 'Disetujui Admin - Silakan Laksanakan Kompensasi & Konfirmasi'; // Greenish
        case 'verified': return 'Terverifikasi Dosen PA (Legacy) - Lanjutkan Pelaksanaan'; // Greenish
        case 'admin_rejected': return 'Ditolak Admin - Perlu Revisi'; // Reddish
        case 'rejected': return 'Ditolak Dosen PA (Legacy) - Perlu Revisi'; // Reddish
        case 'execution_confirmed': return 'Pelaksanaan Terkonfirmasi & Dosen PA Diinfokan'; // Strong Green
        default: return status || 'Status Tidak Diketahui'; // Neutral
    }
}

function getNonSecretaryStatusStyle(status: string | null | undefined): string {
    if (!status) return 'bg-blue-100 text-blue-700 border border-blue-200'; // Neutral/Info
    switch (status) {
        case 'pending_admin_review': return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
        case 'admin_verified': return 'bg-green-100 text-green-800 border border-green-300';
        case 'verified': return 'bg-green-100 text-green-800 border border-green-300';
        case 'admin_rejected': return 'bg-red-100 text-red-800 border border-red-300';
        case 'rejected': return 'bg-red-100 text-red-800 border border-red-300';
        case 'execution_confirmed': return 'bg-teal-100 text-teal-800 border border-teal-300'; // Teal for confirmed
        default: return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
}

// ========================================================================
// SecretaryView Component (Handles the main logic for the secretary)
// ========================================================================
interface SecretaryViewProps {
    user: Student;
    classmates: Student[];
    kompenInfo: KompenInfo | null;
}

function SecretaryView({ user, classmates, kompenInfo }: SecretaryViewProps) {
    // State for input and fetched data
    const [rekapInputData, setRekapInputData] = useState<{ [key: string]: number }>({});
    const [fetchedRekapData, setFetchedRekapData] = useState<{ [key: string]: RekapKehadiran }>({});
    const [batchKompensasi, setBatchKompensasi] = useState<Kompensasi | null>(null);

    // UI state
    const [saving, setSaving] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [submittingConfirmation, setSubmittingConfirmation] = useState<boolean>(false);
    const [loadingRekap, setLoadingRekap] = useState<boolean>(true);
    const [statusMessage, setStatusMessage] = useState<StatusMessage>({
        status: 'idle',
        message: ''
    });

    // Dosen PA state
    const [dosenPAId, setDosenPAId] = useState<string | null>(null);
    const [dosenPAName, setDosenPAName] = useState<string>('');
    const [hasDosenPA, setHasDosenPA] = useState<boolean>(false);

    // --- Effects ---
    useEffect(() => {
        if (classmates.length > 0) {
            loadAllData();
        }
    }, [user.kelas, classmates.length]);

    // Combined data loading function
    async function loadAllData() {
        setLoadingRekap(true);
        setStatusMessage({ status: 'idle', message: '' });

        try {
            // Run both fetch operations concurrently
            const [dosenPAResult, rekapResult] = await Promise.all([
                fetchDosenPAForClass(),
                fetchClassRekapData()
            ]);

            if (dosenPAResult.error) {
                setStatusMessage({
                    status: 'info',
                    message: dosenPAResult.error
                });
            }

            if (rekapResult.error) {
                setStatusMessage({
                    status: 'error',
                    message: rekapResult.error
                });
            }
        } catch (error) {
            console.error('Error loading data:', error);
            setStatusMessage({
                status: 'error',
                message: 'Gagal memuat data. Silakan coba lagi.'
            });
        } finally {
            setLoadingRekap(false);
        }
    }

    async function fetchDosenPAForClass() {
        setHasDosenPA(false);
        setDosenPAId(null);
        setDosenPAName('');

        try {
            const { data: classPAData, error: classPAError } = await supabase
                .from('kelas_dosen_pa')
                .select('id_dosen_pa')
                .eq('kelas', user.kelas)
                .maybeSingle();

            if (classPAError) {
                console.error('Error fetching Dosen PA assignment:', classPAError);
                return { error: 'Gagal memuat data Dosen PA' };
            }

            const paId = classPAData?.id_dosen_pa;

            if (!paId) {
                return { error: 'Belum ada Dosen PA yang ditugaskan untuk kelas ini.' };
            }

            // Get dosen details
            const { data: dosenDetails, error: dosenError } = await supabase
                .from('dosen')
                .select('id_dsn, nama')
                .eq('id_dsn', paId)
                .single();

            if (dosenError) {
                console.error('Error fetching Dosen details:', dosenError);
                return { error: 'Gagal memuat detail Dosen PA' };
            }

            if (dosenDetails) {
                setDosenPAId(paId);
                setDosenPAName(dosenDetails.nama);
                setHasDosenPA(true);
                return { success: true };
            } else {
                return { error: 'Data Dosen PA tidak ditemukan' };
            }
        } catch (error) {
            console.error('Error in fetchDosenPAForClass:', error);
            return { error: 'Gagal memuat data Dosen PA' };
        }
    }

    async function fetchClassRekapData() {
        setFetchedRekapData({});
        setRekapInputData({});
        setBatchKompensasi(null);

        try {
            const studentIds = classmates.map(student => student.id_mhs);
            if (studentIds.length === 0) {
                return { error: 'Tidak ada mahasiswa dalam kelas ini' };
            }

            // 1. Fetch all rekap_kehadiran for class students
            const { data: rekapData, error: rekapError } = await supabase
                .from('rekap_kehadiran')
                .select('*')
                .in('id_mhs', studentIds);

            if (rekapError) {
                console.error('Error fetching rekap data:', rekapError);
                return { error: 'Gagal memuat data rekap kehadiran' };
            }

            const initialInputData: { [key: string]: number } = {};
            const fetchedDataMap: { [key: string]: RekapKehadiran } = {};
            let linkedKompensasiId: string | null = null;

            if (rekapData && rekapData.length > 0) {
                rekapData.forEach((item: RekapKehadiran) => {
                    fetchedDataMap[item.id_mhs] = item;
                    initialInputData[item.id_mhs] = item.menit_tidak_hadir ?? 0;

                    // Find the common id_kompensasi if consistent
                    if (item.id_kompensasi) {
                        if (linkedKompensasiId === null) {
                            linkedKompensasiId = item.id_kompensasi;
                        } else if (linkedKompensasiId !== item.id_kompensasi) {
                            console.warn("Inconsistent kompensasi IDs found in rekap data");
                        }
                    }
                });
            }

            // Initialize input data for students with no rekap record (including zeroes)
            classmates.forEach(student => {
                if (initialInputData[student.id_mhs] === undefined) {
                    initialInputData[student.id_mhs] = 0;
                }
            });

            setFetchedRekapData(fetchedDataMap);
            setRekapInputData(initialInputData);

            // 2. If a common kompensasi ID was found, fetch that batch record
            if (linkedKompensasiId) {
                const { data: kompensasiBatchData, error: kompensasiError } = await supabase
                    .from('kompensasi')
                    .select('*')
                    .eq('id', linkedKompensasiId)
                    .single();

                if (kompensasiError) {
                    console.error("Error fetching batch kompensasi record:", kompensasiError);
                    return { error: 'Gagal memuat data kompensasi' };
                }

                if (kompensasiBatchData) {
                    setBatchKompensasi(kompensasiBatchData);
                }
            }

            return { success: true };

        } catch (error) {
            console.error('Error in fetchClassRekapData:', error);
            return { error: 'Gagal memuat data rekap' };
        }
    }

    function handleMinutesChange(studentId: string, minutes: string) {
        // Update local input state with validation
        const minutesValue = parseInt(minutes);
        setRekapInputData(prev => ({
            ...prev,
            [studentId]: !isNaN(minutesValue) && minutesValue >= 0 ? minutesValue : 0
        }));

        // Clear status message on interaction
        if (statusMessage.status !== 'idle') {
            setStatusMessage({ status: 'idle', message: '' });
        }
    }

    async function saveAttendanceChanges() {
        setSaving(true);
        setStatusMessage({ status: 'idle', message: '' });

        try {
            // Include ALL students in the save operation, even those with zero minutes
            const upsertData = classmates.map(student => {
                const existingRecord = fetchedRekapData[student.id_mhs];
                const minutesValue = rekapInputData[student.id_mhs];
                // Ensure the value is explicitly 0 when it should be zero (not undefined/null)
                const minutes = minutesValue !== undefined && minutesValue !== null ? minutesValue : 0;
                return {
                    id: existingRecord?.id, // Include ID for update, null/undefined for insert
                    id_mhs: student.id_mhs,
                    id_sekretaris: user.id_mhs,
                    kelas: user.kelas,
                    menit_tidak_hadir: rekapInputData[student.id_mhs] || 0,
                    id_kompensasi: existingRecord?.id_kompensasi ?? null, // Preserve existing link
                    updated_at: new Date().toISOString(),
                };
            });

            // Use upsert to handle both inserts and updates
            const { error: upsertError, count } = await supabase
                .from('rekap_kehadiran')
                .upsert(upsertData, {
                    onConflict: 'id',
                    defaultToNull: false
                });

            if (upsertError) throw upsertError;

            // Refresh data after successful save
            await fetchClassRekapData();

            setStatusMessage({
                status: 'success',
                message: `Berhasil menyimpan ${count ?? upsertData.length} data rekap kehadiran!`
            });

        } catch (error) {
            console.error('Error saving attendance data:', error);
            setStatusMessage({
                status: 'error',
                message: `Gagal menyimpan data. ${error instanceof Error ? error.message : String(error)}`
            });
        } finally {
            setSaving(false);
            // Auto-clear success message after delay
            if (statusMessage.status === 'success') {
                setTimeout(() => {
                    setStatusMessage(prev =>
                        prev.status === 'success' ? { status: 'idle', message: '' } : prev
                    );
                }, 3000);
            }
        }
    }

    async function submitRekapToAdmin() {
        if (!hasDosenPA || !dosenPAId) {
            setStatusMessage({
                status: 'error',
                message: 'Tidak dapat mengajukan: Dosen PA untuk kelas ini belum ditentukan oleh Admin Jurusan.'
            });
            return;
        }

        if (batchKompensasi && batchKompensasi.status !== 'admin_rejected' && batchKompensasi.status !== 'rejected' /* legacy */) {
            setStatusMessage({
                status: 'info',
                message: `Rekap kelas ini sudah diajukan (Status: ${getGlobalKompensasiStatus().text}).`
            });
            return;
        }

        setSubmitting(true);
        setStatusMessage({ status: 'info', message: 'Memproses pengajuan...' });

        try {
            // Create batch kompensasi record first
            const { data: newBatch, error: insertError } = await supabase
                .from('kompensasi')
                .insert({
                    id_sekretaris: user.id_mhs,
                    id_dosen_pa: dosenPAId,
                    kelas: user.kelas,
                    status: 'pending_admin_review', // New status
                    semester: kompenInfo?.semester || null,
                    tahun_ajaran: kompenInfo?.tahun_ajaran || null,
                    // created_at will be set by db or use default
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (insertError) throw insertError;
            if (!newBatch) throw new Error("Failed to create batch kompensasi record.");

            // Update all rekap records with the batch ID, regardless of minutes value
            const rekapIds = Object.values(fetchedRekapData).map(r => r.id);

            if (rekapIds.length > 0) {
                const { error: updateError } = await supabase
                    .from('rekap_kehadiran')
                    .update({
                        id_kompensasi: newBatch.id,
                        updated_at: new Date().toISOString()
                    })
                    .in('id', rekapIds);

                if (updateError) {
                    // Try to rollback the batch creation
                    await supabase.from('kompensasi').delete().eq('id', newBatch.id);
                    throw new Error("Gagal menautkan rekap ke batch kompensasi. Pengajuan dibatalkan.");
                }
            }

            setStatusMessage({
                status: 'success',
                message: `Berhasil mengajukan rekap kehadiran kelas ke Admin!`
            });

            // Refresh data to show new status
            await fetchClassRekapData();

        } catch (error) {
            console.error('Error submitting rekap to admin:', error); // Log the full error for debugging
            
            let displayErrorMessage = 'Terjadi kesalahan yang tidak diketahui.';
            if (error instanceof Error && error.message) {
                displayErrorMessage = error.message;
            } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
                // Handle Supabase error objects that might not be direct Error instances but have a message property
                displayErrorMessage = (error as any).message;
            } else if (typeof error === 'string') {
                displayErrorMessage = error;
            }
            setStatusMessage({
                status: 'error',
                message: `Gagal mengajukan rekap. ${displayErrorMessage}`
            });
        } finally {
            setSubmitting(false);
        }
    }

    async function confirmExecutionAndNotifyPA() {
        if (!batchKompensasi || !batchKompensasi.id) {
            setStatusMessage({ status: 'error', message: 'Data kompensasi tidak ditemukan.' });
            return;
        }
        if (!hasDosenPA || !dosenPAId) {
            setStatusMessage({ status: 'error', message: 'Dosen PA belum ditentukan untuk notifikasi.' });
            return;
        }

        setSubmittingConfirmation(true);
        setStatusMessage({ status: 'info', message: 'Memproses konfirmasi pelaksanaan...' });

        try {
            const { error: updateError } = await supabase
                .from('kompensasi')
                .update({
                    status: 'execution_confirmed', // New status
                    updated_at: new Date().toISOString(),
                })
                .eq('id', batchKompensasi.id);

            if (updateError) throw updateError;

            // Kirim notifikasi ke Dosen PA
            if (dosenPAId && batchKompensasi) {
                const pesanNotifikasi = `Kelas ${user.kelas} telah menyelesaikan pelaksanaan kompensasi dan mengkonfirmasinya.`;
                const { error: notifError } = await supabase
                    .from('notifikasi_dosen') // Pastikan nama tabel ini sesuai
                    .insert({
                        id_dosen_penerima: dosenPAId,
                        pesan: pesanNotifikasi,
                        tipe_notifikasi: 'kompensasi_selesai',
                        id_referensi: batchKompensasi.id, // ID dari tabel kompensasi
                        // created_at dan sudah_dibaca akan menggunakan default dari tabel
                    });

                if (notifError) {
                    console.warn('Gagal mengirim notifikasi ke Dosen PA:', notifError.message);
                    // Tidak perlu menghentikan proses utama jika notifikasi gagal, tapi catat errornya.
                    // Anda bisa menambahkan pesan tambahan ke statusMessage jika diperlukan.
                }
            }

            setStatusMessage({
                status: 'success',
                message: 'Berhasil mengkonfirmasi pelaksanaan kompensasi. Dosen PA telah diinformasikan.'
            });
            await fetchClassRekapData(); // Refresh data
            
        } catch (error) {
            console.error('Error confirming execution:', error);
            setStatusMessage({
                status: 'error',
                message: `Gagal mengkonfirmasi. ${error instanceof Error ? error.message : String(error)}`
            });
        } finally {
            setSubmittingConfirmation(false);
        }
    }

    // Get class kompensasi status for the top status display
    const getGlobalKompensasiStatus = () => {
        if (!batchKompensasi) return { text: 'Belum Diajukan', className: 'bg-blue-50 text-blue-700', stage: 0 };

        switch (batchKompensasi.status) {
            case 'pending_admin_review': return { text: 'Menunggu Review Admin', className: 'bg-yellow-50 text-yellow-700', stage: 1 };
            case 'admin_verified': return { text: 'Disetujui Admin - Lanjutkan ke Pelaksanaan & Konfirmasi', className: 'bg-teal-50 text-teal-700', stage: 2 };
            case 'admin_rejected': return { text: 'Ditolak Admin - Perlu Revisi', className: 'bg-red-50 text-red-700', stage: -1 };
            case 'execution_confirmed': return { text: 'Pelaksanaan Terkonfirmasi & Dosen PA Diinfokan', className: 'bg-green-50 text-green-700', stage: 3 };
            // Legacy statuses for graceful handling if old data exists
            case 'pending': return { text: 'Menunggu Verifikasi Dosen PA (Legacy)', className: 'bg-yellow-50 text-yellow-700', stage: 1 }; // Sebaiknya dihindari jika alur baru sudah fix
            case 'verified': return { text: 'Terverifikasi oleh Dosen PA (Legacy)', className: 'bg-green-50 text-green-700', stage: 2 }; // Dianggap setara admin_verified untuk surat
            case 'rejected': return { text: 'Ditolak oleh Dosen PA (Legacy)', className: 'bg-red-50 text-red-700', stage: -1 }; // Sebaiknya dihindari
            default: return { text: batchKompensasi.status || 'Status Tidak Dikenal', className: 'bg-gray-50 text-gray-700', stage: 0 };
        }
    };

    const globalStatus = getGlobalKompensasiStatus();
    const canSubmitToAdmin = !batchKompensasi || batchKompensasi.status === 'admin_rejected' || batchKompensasi.status === 'rejected';
    // Bisa konfirmasi jika statusnya disetujui admin atau status legacy 'verified'
    const canConfirmExecution = batchKompensasi?.status === 'admin_verified' || batchKompensasi?.status === 'verified';
    // Surat bisa dibuat jika disetujui admin, sudah dikonfirmasi pelaksanaan, atau status legacy 'verified'
    const canGenerateLetter = batchKompensasi?.id && (batchKompensasi.status === 'admin_verified' || batchKompensasi.status === 'execution_confirmed' || batchKompensasi.status === 'verified');
    const inputsDisabled = loadingRekap || (batchKompensasi ? globalStatus.stage !== -1 && globalStatus.stage !== 0 : false);

    return (
        <div className="bg-white rounded-lg shadow-lg mt-6 border border-blue-200"> {/* Card utama SecretaryView */}
            <div className="p-4 border-b border-blue-200">
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-lg text-blue-700">Input Rekap Kehadiran</h2>
                    {hasDosenPA ? (
                        <p className="text-sm text-blue-700 bg-blue-100 px-2 py-1 rounded border border-blue-200">Dosen PA Kelas: {dosenPAName}</p>
                    ) : (
                        <p className="text-sm text-red-700 bg-red-100 px-2 py-1 rounded border border-red-200">Dosen PA belum ditugaskan</p>
                    )}
                </div>
                <p className="text-sm text-gray-500">Input total menit ketidakhadiran untuk setiap mahasiswa.</p>
            </div>

            {/* Global Kompensasi Status */}
            <div className={`p-4 border-b border-blue-200 ${globalStatus.className}`}>
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-blue-800">Status Kompensasi Kelas: {globalStatus.text}</h3>
                    {batchKompensasi && (
                        <span className="text-sm text-gray-500">
                            Diajukan pada: {new Date(batchKompensasi.created_at).toLocaleDateString('id-ID')}
                        </span>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-b border-blue-200 bg-blue-50"> {/* Button bar */}
                <div className="flex gap-3 items-center overflow-x-auto pb-2"> {/* Menghapus flex-wrap, menambah overflow-x-auto dan padding bawah untuk scrollbar */}
                    <button
                        onClick={saveAttendanceChanges}
                        disabled={saving || inputsDisabled}
                        className="px-3 py-2 text-sm bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50 flex items-center transition duration-150 ease-in-out whitespace-nowrap"
                    >
                        {saving ? 'Menyimpan...' : 'Simpan Data'}
                    </button>

                    <button
                        onClick={submitRekapToAdmin}
                        disabled={submitting || loadingRekap || !hasDosenPA || !canSubmitToAdmin}
                        className="px-3 py-2 text-sm bg-green-600 text-white font-semibold rounded hover:bg-green-700 disabled:opacity-50 flex items-center transition duration-150 ease-in-out whitespace-nowrap"
                    >
                        {submitting ? 'Mengajukan ke Admin...' : 'Ajukan Rekap ke Admin'}
                    </button>

                    <button
                        onClick={confirmExecutionAndNotifyPA}
                        disabled={submittingConfirmation || loadingRekap || !canConfirmExecution || !hasDosenPA}
                        className="px-3 py-2 text-sm bg-teal-600 text-white font-semibold rounded hover:bg-teal-700 disabled:opacity-50 flex items-center transition duration-150 ease-in-out whitespace-nowrap"
                    >
                        {submittingConfirmation ? 'Memproses...' : 'Konfirmasi Pelaksanaan & Info Dosen PA'}
                    </button>

                    <Link
                        href={`/pages-mahasiswa/kompensasi/surat?kelasId=${user?.kelas || ''}&kompensasiId=${batchKompensasi?.id || ''}`}
                        className={`px-3 py-2 text-sm bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700 ${!canGenerateLetter ? 'opacity-50 pointer-events-none' : ''} whitespace-nowrap`}
                    >
                        Buat Surat Kompensasi
                    </Link>
                </div>

                {/* Status Message Display */}
                {statusMessage.message && (
                    <div className={`mt-3 p-3 rounded text-sm ${statusMessage.status === 'success' ? 'bg-green-100 text-green-700' :
                        statusMessage.status === 'error' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700' // Info uses yellow
                        } border ${statusMessage.status === 'success' ? 'border-green-200' : statusMessage.status === 'error' ? 'border-red-200' : 'border-yellow-200'}`}>
                        {statusMessage.message}
                    </div>
                )}
            </div>

            {/* Student List Table */}
            <div className="overflow-x-auto">
                <div className="flex justify-end pt-2 pb-2 pr-2">
                    <button
                        onClick={loadAllData}
                        title="Muat Ulang Data"
                        disabled={loadingRekap || saving || submitting || submittingConfirmation}
                        className="p-2 text-blue-600 rounded-full hover:bg-blue-100 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
                    >
                        <FiRefreshCw size={20} />
                    </button>
                </div>
                {loadingRekap ? (
                    <div className="p-4 text-center text-gray-500">Memuat data rekap kehadiran...</div>
                ) : (
                    <table className="min-w-full divide-y divide-blue-200">
                        <thead className="bg-blue-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Nama</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">NIM</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Menit Tidak Hadir</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-blue-200">
                            {classmates.map((student, index) => (
                                <tr key={student.id_mhs} className={index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">{index + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-800">
                                        {student.nama}
                                        {student.id_mhs === user.id_mhs && (
                                            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                                (Sekretaris)
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.nim}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="number"
                                            min="0"
                                            value={rekapInputData[student.id_mhs] ?? 0}
                                            onChange={(e) => handleMinutesChange(student.id_mhs, e.target.value)}
                                            disabled={inputsDisabled}
                                            className="border border-gray-300 rounded px-2 py-1 w-24 text-center placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer Notes */}
            <div className="p-4 border-t border-blue-200 bg-blue-50 text-sm text-blue-700 rounded-b-lg">
                <p className="mb-2"><strong className="text-blue-800">Catatan Penting:</strong></p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                    <li>Pastikan data kehadiran sudah benar sebelum diajukan ke Admin.</li>
                    <li>Setelah rekap diajukan ke Admin dan disetujui, Anda harus mengkonfirmasi pelaksanaan kompensasi.</li>
                    <li>Dosen PA akan diinformasikan setelah Anda mengkonfirmasi pelaksanaan.</li>
                    <li>Untuk pertanyaan atau bantuan, silakan hubungi bagian akademik.</li>
                </ul>
            </div>
        </div>
    );
}