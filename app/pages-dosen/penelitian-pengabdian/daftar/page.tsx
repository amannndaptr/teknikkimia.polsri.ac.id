'use client';

import SidebarDosen from '@/components/SidebarDosen';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';import { FileText, Trash2, ListChecks } from 'lucide-react'; // Tambahkan ListChecks
import { format } from 'date-fns';

interface DokumenDosen {
    id: string;
    user_id: string;
    judul: string;
    kategori: string;
    file_name_asli: string;
    file_url_publik: string;
    file_path_storage: string;
    created_at: string;
}

const SUPABASE_BUCKET_NAME = 'penelitian-pengabdian-files';
const SUPABASE_TABLE_NAME = 'penelitian_pengabdian';

const DaftarDokumenPage = () => {
    const [dokumenList, setDokumenList] = useState<DokumenDosen[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [initialPageLoading, setInitialPageLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);
    const [deleting, setDeleting] = useState(false); // State untuk proses delete
    const [authAccessError, setAuthAccessError] = useState<string | null>(null); // Error untuk auth/role
    const [operationError, setOperationError] = useState<string | null>(null); // Error untuk operasi CRUD
    const [operationSuccess, setOperationSuccess] = useState<string | null>(null); // Sukses untuk operasi CRUD

    const supabase = createClient();

    useEffect(() => {
        const getCurrentUserAndProfile = async () => {
            setInitialPageLoading(true);
            setAuthAccessError(null);
            setUserId(null);
            setUserRole(null);

            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                setAuthAccessError("Gagal mendapatkan data pengguna. Silakan login ulang.");
                console.error("Error getting user:", authError);
                setInitialPageLoading(false);
                return;
            }
            setUserId(user.id);

            if (!user.email) {
                setAuthAccessError("Email pengguna tidak ditemukan setelah autentikasi.");
                console.error("User email not found after auth.");
                setInitialPageLoading(false);
                return;
            }

            // Fetch dosen data to get role
            const { data: dosenData, error: dosenError } = await supabase
                .from('dosen') 
                .select('role')
                .eq('email', user.email) // Use email to match with dosen table
                .single();

            if (dosenError || !dosenData) {
                let errorMessage = "Gagal mengambil data dosen.";
                if (dosenError) {
                    console.error("Error getting dosen data:", JSON.stringify(dosenError, null, 2));
                    if (dosenError.code === 'PGRST116') {
                        errorMessage = `Data dosen untuk email '${user.email}' tidak ditemukan atau tidak unik.`;
                    } else {
                        errorMessage = `Gagal mengambil data dosen: ${dosenError.message || 'Error tidak diketahui'}`;
                    }
                } else if (!dosenData) {
                    errorMessage = `Data dosen tidak ditemukan untuk email: ${user.email}.`;
                }
                setAuthAccessError(errorMessage);
                setInitialPageLoading(false);
                return;
            }

            setUserRole(dosenData.role);

            if (dosenData.role === 'Dosen') {
                await fetchDokumen(user.id); // fetchDokumen akan mengelola tableLoading
            } else {
                setAuthAccessError("Maaf, Anda tidak dapat mengakses halaman ini");
            }
            setInitialPageLoading(false);
        };
        getCurrentUserAndProfile();
    }, []);

    const fetchDokumen = async (currentUserId: string) => {
        if (!currentUserId) return;
        setTableLoading(true);
        setOperationError(null); // Reset error operasi tabel
        try {
            const { data, error: fetchError } = await supabase
                .from(SUPABASE_TABLE_NAME)
                .select('*')
                .eq('user_id', currentUserId)
                .order('created_at', { ascending: false });
            if (fetchError) throw fetchError;
            setDokumenList(data || []);
        } catch (err: any) {
            console.error("Error fetching dokumen:", err.message);
            setOperationError(`Gagal memuat daftar dokumen: ${err.message}`);
        } finally {
            setTableLoading(false);
        }
    };

    const handleDelete = async (dokumen: DokumenDosen) => {
        if (!userId) {
            setOperationError("Sesi pengguna tidak valid untuk menghapus.");
            return;
        }
        if (!confirm(`Anda yakin ingin menghapus dokumen "${dokumen.judul}"?`)) {
            return;
        }

        setOperationError(null);
        setOperationSuccess(null);
        setDeleting(true);

        try {
            const { error: deleteStorageError } = await supabase.storage
                .from(SUPABASE_BUCKET_NAME)
                .remove([dokumen.file_path_storage]);

            if (deleteStorageError) {
                console.warn("Gagal menghapus file dari storage:", deleteStorageError.message);
            }

            const { error: deleteDbError } = await supabase
                .from(SUPABASE_TABLE_NAME)
                .delete()
                .eq('id', dokumen.id)
                .eq('user_id', userId);

            if (deleteDbError) throw deleteDbError;

            setOperationSuccess(`Dokumen "${dokumen.judul}" berhasil dihapus.`);
            fetchDokumen(userId); // Muat ulang daftar

        } catch (err: any) {
            console.error("Error deleting dokumen:", err.message);
            setOperationError(`Gagal menghapus dokumen: ${err.message}`);
        } finally {
            setDeleting(false);
        }
    };

    if (initialPageLoading) {
        return (
            <div className="flex min-h-screen bg-[#D1D9E6] justify-center items-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em]"></div>
                    <p className="mt-3 text-base text-gray-600">Memeriksa sesi pengguna...</p>
                </div>
            </div>
        );
    }
    
    // Jika otentikasi awal gagal (userId tidak diset dan ada authAccessError)
    if (!userId && authAccessError) {
         return (
            <div className="container mx-auto p-6 min-h-screen flex flex-col justify-center items-center bg-[#D1D9E6]">
                 <h1 className="text-2xl font-semibold mb-4 text-red-700">Akses Ditolak</h1>
                 <Card className="bg-[#BAC3D0] border-gray-400 w-full max-w-md"><CardContent className="pt-6"><p className="text-center text-gray-700">{authAccessError || "Anda harus login untuk mengakses halaman ini."}</p></CardContent></Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#D1D9E6]">
            <SidebarDosen />
            <main className="flex-1 p-4 md:p-6">
                {userRole === 'Dosen' && userId ? (
                    <div className="container mx-auto space-y-6 p-6 rounded-lg shadow bg-[#D1D9E6]">
                        <div> {/* Grup untuk judul dan deskripsi */}
                            <div className="flex items-center border-b pb-2">
                                <ListChecks className="h-7 w-7 mr-2 text-gray-800" />
                                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Daftar Dokumen Tersimpan</h1>
                            </div>
                            <p className="text-gray-600 mt-1">Berikut adalah daftar dokumen penelitian, pengabdian, dan materi pembelajaran yang telah Anda unggah.</p> {/* Mengurangi jarak lebih lanjut dengan mt-1 */}
                        </div>
                        {operationError && <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg shadow-sm">{operationError}</div>}
                        {operationSuccess && <div className="mb-6 p-4 bg-green-50 text-green-700 border border-green-200 rounded-lg shadow-sm">{operationSuccess}</div>}
                        <Card className="shadow-lg rounded-lg bg-[#BAC3D0] border-gray-400">
                            <CardHeader><CardTitle className="text-xl text-gray-700">Dokumen Anda</CardTitle></CardHeader>
                            <CardContent>
                                {tableLoading && dokumenList.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500"><div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div><p className="mt-3 text-sm">Memuat daftar dokumen...</p></div>
                                ) : !tableLoading && dokumenList.length === 0 ? (
                                    <p className="text-center py-10 text-gray-500 bg-gray-50 rounded-md">Belum ada dokumen yang diunggah.</p>
                                ) : (
                                    <Table><TableHeader><TableRow><TableHead>Judul</TableHead><TableHead>Kategori</TableHead><TableHead>File</TableHead><TableHead>Tanggal Unggah</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{dokumenList.map((doc) => (<TableRow key={doc.id} className="hover:bg-gray-50 transition-colors"><TableCell className="font-medium max-w-xs truncate" title={doc.judul}>{doc.judul}</TableCell><TableCell>{doc.kategori}</TableCell><TableCell><a href={doc.file_url_publik} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center group"><FileText className="h-4 w-4 mr-1 flex-shrink-0" /><span className="truncate group-hover:underline" title={doc.file_name_asli}>{doc.file_name_asli}</span></a></TableCell><TableCell className="text-sm text-gray-500">{format(new Date(doc.created_at), 'dd MMM yyyy, HH:mm')}</TableCell><TableCell className="text-right"><Button variant="destructive" size="sm" onClick={() => handleDelete(doc)} disabled={deleting || tableLoading}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>))}</TableBody></Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    // Pengguna bukan Dosen atau terjadi error saat cek profil
                    <div className="container mx-auto p-6 flex flex-col justify-center items-center h-full">
                        <h1 className="text-2xl font-semibold mb-4 text-amber-700">Akses Ditolak</h1>
                        <Card className="bg-[#BAC3D0] border-gray-400 w-full max-w-md">
                            <CardContent className="pt-6">
                                <p className="text-center text-gray-700">{authAccessError || "Akses ke halaman ini terbatas."}</p>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
};

export default DaftarDokumenPage;