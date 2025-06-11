'use client';

import SidebarDosen from '@/components/SidebarDosen';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation'; // Untuk navigasi
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloud, FileText } from 'lucide-react'; // Tambahkan FileText

const KATEGORI_DOKUMEN = ["Materi Pembelajaran", "Penelitian dan Pengabdian"];
const SUPABASE_BUCKET_NAME = 'penelitian-pengabdian-files';
const SUPABASE_TABLE_NAME = 'penelitian_pengabdian';

const UnggahDokumenPage = () => {
    const [userId, setUserId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null); // State untuk menyimpan role pengguna
    const [loadingUser, setLoadingUser] = useState(true); // Loading state khusus untuk user check
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form state
    const [judul, setJudul] = useState('');
    const [kategori, setKategori] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null); // State untuk file cover

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const getCurrentUser = async () => {
            setLoadingUser(true);
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                setError("Gagal mendapatkan data pengguna. Silakan login ulang.");
                console.error("Error getting user:", userError);
                setLoadingUser(false);
                return;
            }
            if (!user.email) {
                setError("Email pengguna tidak ditemukan setelah autentikasi.");
                console.error("User email not found after auth.");
                setLoadingUser(false);
                return;
            }

            // Ambil data dosen untuk mendapatkan role
            const { data: dosenData, error: dosenError } = await supabase
                .from('dosen') 
                .select('role')
                .eq('email', user.email) // Menggunakan email untuk mencocokkan dengan tabel dosen
                .single();

            if (dosenError || !dosenData) {
                let errorMessage = "Gagal mengambil data dosen.";
                if (dosenError) {
                    console.error("Error getting dosen data:", JSON.stringify(dosenError, null, 2));
                    if (dosenError.code === 'PGRST116') { 
                        errorMessage = `Data dosen untuk email '${user.email}' tidak ditemukan atau tidak unik. Pastikan data dosen ada.`;
                    } else {
                        errorMessage = `Gagal mengambil data dosen: ${dosenError.message || 'Error tidak diketahui'}`;
                    }
                } else if (!dosenData) {
                    errorMessage = `Data dosen tidak ditemukan untuk email: ${user.email}.`;
                }
                setError(errorMessage);
                setLoadingUser(false);
                return;
            }

            if (dosenData.role !== 'Dosen') {
                setError("Maaf, Anda tidak dapat mengakses halaman ini");
                setUserRole(dosenData.role); 
            } else {
                setUserId(user.id);
                setUserRole(dosenData.role);
            }
            setLoadingUser(false);
        };
        getCurrentUser();
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setSelectedFile(file || null);
    };

    const handleCoverFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setSelectedCoverFile(file || null);
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        if (!userId || userRole !== 'Dosen') {
            setError("Sesi pengguna tidak ditemukan. Mohon login ulang.");
            return;
        }
        if (!judul || !kategori || !selectedFile) {
            setError("Mohon lengkapi Judul, Kategori, dan pilih File.");
            return;
        }

        setUploading(true);

        const fileNameAsli = selectedFile.name;
        const kategoriPath = kategori.replace(/\s+/g, '_');
        const filePathStorage = `${userId}/${kategoriPath}/${fileNameAsli}`;
        let coverFileUrlPublik: string | null = null;

        try {
            const { error: uploadError } = await supabase.storage
                .from(SUPABASE_BUCKET_NAME)
                .upload(filePathStorage, selectedFile, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) {
                if (uploadError.message.includes('Duplicate') || uploadError.message.includes('already exists')) {
                    setError(`File dengan nama "${fileNameAsli}" sudah ada untuk kategori "${kategori}" ini. Harap ganti nama file atau periksa kembali.`);
                } else {
                    throw uploadError;
                }
                setUploading(false);
                return;
            }

            // Unggah file cover jika ada
            if (selectedCoverFile) {
                const coverFileNameAsli = selectedCoverFile.name;
                // Simpan cover di folder yang sama atau berbeda, contoh: /covers/
                const coverFilePathStorage = `${userId}/${kategoriPath}/covers/${coverFileNameAsli}`; 

                const { error: coverUploadError } = await supabase.storage
                    .from(SUPABASE_BUCKET_NAME) // Atau bucket lain khusus untuk cover
                    .upload(coverFilePathStorage, selectedCoverFile, {
                        cacheControl: '3600',
                        upsert: false, // Ganti jadi true jika ingin bisa menimpa cover dengan nama sama
                    });

                if (coverUploadError) {
                    // Pertimbangkan bagaimana menangani error unggah cover, mungkin tidak menghentikan proses utama
                    console.warn("Gagal mengunggah file cover:", coverUploadError.message);
                    // Anda bisa memilih untuk tetap melanjutkan atau menampilkan error spesifik
                } else {
                    const { data: publicCoverUrlData } = supabase.storage
                        .from(SUPABASE_BUCKET_NAME)
                        .getPublicUrl(coverFilePathStorage);
                    coverFileUrlPublik = publicCoverUrlData?.publicUrl || null;
                }
            }

            const { data: publicUrlData } = supabase.storage
                .from(SUPABASE_BUCKET_NAME)
                .getPublicUrl(filePathStorage);

            if (!publicUrlData || !publicUrlData.publicUrl) {
                await supabase.storage.from(SUPABASE_BUCKET_NAME).remove([filePathStorage]);
                throw new Error('Gagal mendapatkan URL publik file.');
            }
            const fileUrlPublik = publicUrlData.publicUrl;

            const { error: insertError } = await supabase
                .from(SUPABASE_TABLE_NAME)
                .insert([{
                    user_id: userId,
                    judul,
                    kategori,
                    file_name_asli: fileNameAsli,
                    file_url_publik: fileUrlPublik,
                    cover_image_url: coverFileUrlPublik, // Simpan URL cover
                    file_path_storage: filePathStorage,
                }]);

            if (insertError) {
                await supabase.storage.from(SUPABASE_BUCKET_NAME).remove([filePathStorage]);
                throw insertError;
            }

            setSuccess("Dokumen berhasil diunggah! Mengarahkan ke daftar dokumen...");
            setJudul('');
            setKategori('');
            setSelectedFile(null);
            setSelectedCoverFile(null); // Reset state file cover
            const fileInput = document.getElementById('file-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            const coverFileInput = document.getElementById('cover-file-input') as HTMLInputElement;
            if (coverFileInput) coverFileInput.value = '';
            
            setTimeout(() => {
                router.push('/pages-dosen/penelitian-pengabdian/daftar'); // Navigasi ke halaman daftar
            }, 2000); // Tunggu 2 detik sebelum navigasi

        } catch (err: any) {
            console.error("Submission error:", err.message);
            setError(`Gagal menyimpan dokumen: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    if (loadingUser) {
        return (
            <div className="container mx-auto p-6 flex justify-center items-center min-h-screen bg-[#D1D9E6]">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em]"></div>
                    <p className="mt-3 text-base text-gray-600">Memeriksa sesi pengguna...</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex min-h-screen bg-[#D1D9E6]">
            <SidebarDosen />
            <main className="flex-1 p-4 md:p-6">
                {(!userId || userRole !== 'Dosen') && !loadingUser ? (
                    <div className="container mx-auto p-6 flex flex-col justify-center items-center h-full">
                        <h1 className="text-2xl font-semibold mb-4 text-amber-700">Akses Ditolak</h1>
                        <Card className="bg-[#BAC3D0] border-gray-400 w-full max-w-md">
                            <CardContent className="pt-6">
                                <p className="text-center text-gray-700">{error || "Anda harus login sebagai Dosen untuk mengakses halaman ini."}</p>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="container mx-auto space-y-2 p-6 rounded-lg shadow bg-[#D1D9E6]">
                        <div className="flex items-center border-b pb-2">
                            <FileText className="h-7 w-7 mr-2 text-gray-800" /> {/* Tambahkan ikon di sini */}
                            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Upload Dokumen</h1>
                        </div>
                        <p className="text-gray-600">Lengkapi form di bawah untuk mengunggah dokumen penelitian, pengabdian, atau materi pembelajaran.</p>
                        {error && <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg shadow-sm">{error}</div>}
                        {success && <div className="mb-6 p-4 bg-green-50 text-green-700 border border-green-200 rounded-lg shadow-sm">{success}</div>}
                        <form id="upload-form" onSubmit={handleSubmit} className="space-y-6 mt-6 p-6 rounded-lg shadow-lg bg-[#BAC3D0] border border-gray-400">
                            <div><Label htmlFor="judul">Judul Dokumen</Label><Input id="judul" value={judul} onChange={(e) => setJudul(e.target.value)} required disabled={uploading || userRole !== 'Dosen'} /></div>
                            <div><Label htmlFor="kategori">Kategori Dokumen</Label><Select value={kategori} onValueChange={setKategori} disabled={uploading || userRole !== 'Dosen'}><SelectTrigger id="kategori"><SelectValue placeholder="-- Pilih kategori --" /></SelectTrigger><SelectContent>{KATEGORI_DOKUMEN.map(kat => <SelectItem key={kat} value={kat}>{kat}</SelectItem>)}</SelectContent></Select></div>
                            <div>
                                <Label htmlFor="file-input">Pilih File Dokumen</Label>
                                <Input id="file-input" type="file" onChange={handleFileChange} required disabled={uploading || userRole !== 'Dosen'} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.png,.zip,.rar" />
                                {selectedFile && <p className="mt-2 text-sm text-gray-500">File dokumen terpilih: <span className="font-medium text-gray-700">{selectedFile.name}</span></p>}
                            </div>
                            <div>
                                <Label htmlFor="cover-file-input">Pilih Cover (Opsional)</Label>
                                <Input id="cover-file-input" type="file" onChange={handleCoverFileChange} disabled={uploading || userRole !== 'Dosen'} accept="image/png, image/jpeg, image/webp" />
                                {selectedCoverFile && <p className="mt-2 text-sm text-gray-500">Cover terpilih: <span className="font-medium text-gray-700">{selectedCoverFile.name}</span></p>}
                            </div>
                        </form>
                        <div className="flex justify-end mt-6"><Button form="upload-form" type="submit" disabled={uploading || !selectedFile || !judul || !kategori || userRole !== 'Dosen'} className="w-full sm:w-auto bg-teal-700 hover:bg-teal-800 text-white">{uploading ? (<><span className="animate-spin rounded-full h-5 w-5 border-t-2 border-r-2 border-white mr-2"></span>Mengunggah...</>) : (<><UploadCloud className="h-5 w-5 mr-2" /> Upload</>)}</Button></div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default UnggahDokumenPage;