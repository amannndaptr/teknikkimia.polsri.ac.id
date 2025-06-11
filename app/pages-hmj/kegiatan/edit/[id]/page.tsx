'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Save, ArrowLeft, Image as ImageIcon, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import SidebarHMJ from '@/components/SidebarHMJ'; // Import SidebarHMJ
import NextImage from 'next/image'; // Untuk preview

interface KegiatanItem {
    id: string;
    description: string | null;
    image_urls: string[]; // Changed to array of strings
    created_at?: string;
    updated_at?: string | null;
}

interface PreviewItem {
    id: string; // Unique ID for React key, can be temp
    url: string; // Blob URL for new files, or existing Supabase URL
    file?: File; // The actual file object for new uploads
    isNew: boolean; // True if this is a newly selected file, false if it's an existing one from DB
    originalDbUrl?: string; // If isNew is false, this is the URL as stored in DB (used for deletion tracking)
}

const BUCKET_NAME = 'kegiatan-images'; // Sesuaikan dengan nama bucket Anda

export default function EditKegiatanPage() {
    const params = useParams();
    const router = useRouter();
    const kegiatanId = Array.isArray(params.id) ? params.id[0] : params.id;

    const [description, setDescription] = useState('');
    const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
    const [dbUrlsToDelete, setDbUrlsToDelete] = useState<string[]>([]);
    
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const supabase = createClient();

    useEffect(() => {
        if (kegiatanId) {
            setLoadingData(true);
            const fetchKegiatanItem = async () => {
                const { data, error: dbError } = await supabase
                    .from('kegiatan')
                    .select('id, description, image_urls')
                    .eq('id', kegiatanId)
                    .single();

                if (dbError || !data) {
                    console.error('Error fetching kegiatan item:', dbError);
                    setError('Gagal memuat data kegiatan. Mungkin kegiatan ini tidak ada.');
                    setLoadingData(false);
                    return;
                }
                
                setDescription(data.description || '');
                const existingImageUrls = data.image_urls || [];
                const initialPreviews: PreviewItem[] = existingImageUrls.map((url: string) => ({
                    id: self.crypto.randomUUID(),
                    url: url,
                    isNew: false,
                    originalDbUrl: url,
                }));
                setPreviewItems(initialPreviews);
                setLoadingData(false);
            };
            fetchKegiatanItem();
        } else {
            setError('ID Kegiatan tidak ditemukan.');
            setLoadingData(false);
        }
    }, [kegiatanId, supabase]);

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        setError(null);
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            const newPreviews: PreviewItem[] = [];

            for (const file of filesArray) {
                if (file.size > 5 * 1024 * 1024) { // Max 5MB
                    setError(`File ${file.name} terlalu besar (maks 5MB).`);
                    continue; 
                }
                const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (!acceptedImageTypes.includes(file.type)) {
                    setError(`Format file ${file.name} tidak didukung (JPG, PNG, GIF, WEBP).`);
                    continue; 
                }
                newPreviews.push({
                    id: self.crypto.randomUUID(),
                    url: URL.createObjectURL(file),
                    file: file,
                    isNew: true,
                });
            }
            setPreviewItems(prev => [...prev, ...newPreviews]);
            e.target.value = ''; // Reset file input
        }
    };

    const handleRemovePreviewItem = (idToRemove: string) => {
        setPreviewItems(prevItems => {
            const itemToRemove = prevItems.find(item => item.id === idToRemove);
            if (itemToRemove) {
                if (!itemToRemove.isNew && itemToRemove.originalDbUrl) {
                    setDbUrlsToDelete(prevDelete => [...prevDelete, itemToRemove.originalDbUrl!]);
                }
                if (itemToRemove.isNew && itemToRemove.url.startsWith('blob:')) {
                    URL.revokeObjectURL(itemToRemove.url); 
                }
            }
            return prevItems.filter(item => item.id !== idToRemove);
        });
    };

    const extractImagePath = (imageUrl: string | null): string => {
        if (!imageUrl) return '';
        try {
            const url = new URL(imageUrl);
            const pathSegments = url.pathname.split('/');
            const bucketIndex = pathSegments.indexOf(BUCKET_NAME);
            if (bucketIndex !== -1 && bucketIndex + 1 < pathSegments.length) {
                return pathSegments.slice(bucketIndex + 1).join('/');
            }
        } catch (e) {
            console.error("Invalid image URL for path extraction:", imageUrl, e);
        }
        return '';
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!description.trim()) {
            setError('Deskripsi kegiatan wajib diisi.');
            return;
        }
        if (previewItems.length === 0) {
            setError('Minimal satu gambar kegiatan wajib diunggah.');
            return;
        }
        if (!kegiatanId) {
            setError('ID Kegiatan tidak valid untuk update.');
            return;
        }

        setSaving(true);
        const finalImageUrls: string[] = [];
        const newFilesToUpload: File[] = [];

        previewItems.forEach(item => {
            if (item.isNew && item.file) {
                newFilesToUpload.push(item.file);
            } else if (!item.isNew && item.originalDbUrl) {
                finalImageUrls.push(item.originalDbUrl);
            }
        });

        try {
            // 1. Delete images from storage that were marked for deletion
            if (dbUrlsToDelete.length > 0) {
                const pathsToDelete = dbUrlsToDelete.map(url => extractImagePath(url)).filter(path => path !== '');
                if (pathsToDelete.length > 0) {
                    const { error: deleteStorageError } = await supabase.storage
                        .from(BUCKET_NAME)
                        .remove(pathsToDelete);
                    if (deleteStorageError) {
                        console.warn('Gagal menghapus beberapa gambar dari storage:', deleteStorageError.message);
                    }
                }
            }

            // 2. Upload new files
            for (const file of newFilesToUpload) {
                const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .upload(fileName, file);

                if (uploadError) throw new Error(`Gagal unggah gambar ${file.name}: ${uploadError.message}`);
                
                const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path);
                if (!publicUrlData?.publicUrl) throw new Error(`Gagal mendapatkan URL publik untuk ${file.name}.`);
                finalImageUrls.push(publicUrlData.publicUrl);
            }

            // 3. Update data in Supabase database
            const dataToUpdate: Omit<KegiatanItem, 'id' | 'created_at'> & { updated_at: string } = {
                description: description.trim(),
                image_urls: finalImageUrls,
                updated_at: new Date().toISOString(),
            };

            const { error: updateError } = await supabase
                .from('kegiatan')
                .update(dataToUpdate as any) // Cast as any to bypass strict KegiatanItem type for update
                .eq('id', kegiatanId);

            if (updateError) throw new Error(`Gagal update kegiatan: ${updateError.message}`);
            
            // Reset states related to file changes after successful save
            setDbUrlsToDelete([]);

            setTimeout(() => router.push('/pages-hmj/kegiatan'), 1500);

        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan saat menyimpan.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loadingData) {
        // Loading state with sidebar
        return (
            <div className="min-h-screen theme-hmj"> {/* Tema diubah ke hmj */}
                <SidebarHMJ />
                <main className="ml-72 px-4 py-3 md:px-6 md:py-4 bg-gray-100 w-[calc(100%-18rem)] min-h-screen overflow-y-auto flex justify-center items-center"> {/* Padding vertikal dikurangi lagi */}
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-700 mx-auto"></div> {/* Spinner disesuaikan */}
                        <p className="ml-3 mt-3 text-gray-600">Memuat data kegiatan...</p> {/* Margin top dikurangi */}
                    </div>
                </main>
            </div>
        );
    }

    if (!kegiatanId && !loadingData) { // If not loading and kegiatanId is somehow lost (should not happen if logic is correct)
        // Error state with sidebar
        return (
            <div className="min-h-screen theme-hmj"> {/* Tema diubah ke hmj */}
                <SidebarHMJ />
                <main className="ml-72 px-4 py-3 md:px-6 md:py-4 bg-gray-100 w-[calc(100%-18rem)] min-h-screen overflow-y-auto flex flex-col justify-center items-center"> {/* Padding vertikal dikurangi lagi */}
                    <AlertTriangle className="w-12 h-12 text-destructive mb-3" /> {/* Margin bottom dikurangi */}
                    <p className="text-destructive">{error || 'Tidak dapat menemukan data kegiatan.'}</p>
                    <Link href="/pages-hmj/kegiatan" className="mt-4 px-4 py-2 bg-rose-700 text-white rounded-md hover:bg-rose-800">Kembali ke Daftar Kegiatan</Link> {/* Tombol disesuaikan, margin disamakan */}
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen theme-hmj"> {/* Tema diubah ke hmj */}
            <SidebarHMJ />
            <main className="ml-72 px-4 py-3 md:px-6 md:py-4 bg-gray-100 w-[calc(100%-18rem)] min-h-screen overflow-y-auto"> {/* Padding vertikal dikurangi lagi */}
                {/* Header dipindahkan ke luar card */}
                <div className="max-w-4xl mx-auto mb-3"> {/* Margin bottom dikurangi lagi */}
                    <div className="flex items-center">
                        <Link href="/pages-hmj/kegiatan" className="text-gray-800 hover:text-rose-700 hover:bg-rose-100 mr-3 p-1 rounded-full transition-colors"> {/* Warna default ikon kembali disamakan dengan font judul, hover diubah */}
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <h1 className="text-2xl font-semibold text-gray-800">Edit Kegiatan</h1> {/* Teks judul disesuaikan */}
                    </div>
                </div>

                <div className="max-w-4xl mx-auto bg-white p-3 md:p-4 rounded-lg shadow-xl border border-rose-500"> {/* Padding card dikurangi lagi */}
                    {error && <div className="mb-2 p-2 bg-destructive/10 text-destructive border border-destructive/30 rounded-md flex items-center text-sm"><AlertTriangle className="w-5 h-5 mr-2" />{error}</div>} {/* Margin bottom dan padding dikurangi lagi */}
                    {success && <div className="mb-2 p-2 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30 rounded-md flex items-center text-sm"><CheckCircle className="w-5 h-5 mr-2" />{success}</div>} {/* Margin bottom dan padding dikurangi lagi */}

                    <form id="editKegiatanForm" onSubmit={handleSubmit} className="space-y-3"> {/* Spasi antar elemen form dikurangi lagi */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-600 mb-1">Deskripsi Kegiatan</label> {/* Teks label disesuaikan */}
                            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full p-2 border border-rose-300 bg-gray-50 text-gray-800 rounded-md shadow-sm focus:outline-none text-sm" placeholder="Masukkan deskripsi singkat kegiatan..." /> {/* Rows textarea dikurangi */}
                        </div>
                        <div>
                            <label htmlFor="image" className="block text-sm font-medium text-gray-600 mb-1">Gambar Kegiatan (Bisa lebih dari satu)</label> {/* Teks label disesuaikan */}
                            <input type="file" id="image" onChange={handleImageChange} accept="image/png, image/jpeg, image/gif, image/webp" multiple className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-rose-100 file:text-rose-700 hover:file:bg-rose-200"/> {/* Input file disesuaikan */}
                            
                            {previewItems.length > 0 && (
                                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"> {/* Margin top dan gap dikurangi lagi, max-h preview dikurangi */}
                                    {previewItems.map((item) => (
                                        <div key={item.id} className="relative group border border-rose-200 rounded-md p-1 bg-gray-50"> {/* Preview item disesuaikan */}
                                            <NextImage src={item.url} alt="Preview Gambar" width={120} height={120} className="rounded-md object-contain w-full h-auto max-h-[120px]" onError={() => { /* Optionally handle image load error for previews */ }} />
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePreviewItem(item.id)}
                                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" // Tombol hapus preview disesuaikan
                                                title="Hapus gambar ini"
                                            >
                                                <XCircle size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="mt-1 text-xs text-gray-500">Format: JPG, PNG, GIF, WEBP. Maks: 5MB per file. Tambah gambar baru atau hapus yang lama.</p> {/* Teks bantuan disesuaikan */}
                        </div>
                    </form>
                </div>
                {/* Tombol Simpan di luar card */}
                <div className="max-w-4xl mx-auto mt-3 flex justify-end"> {/* Margin top dikurangi lagi */}
                    <button type="submit" form="editKegiatanForm" disabled={saving || loadingData} className="px-4 py-2 text-sm font-medium text-white bg-rose-700 rounded-md hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:bg-rose-700/50 flex items-center"> {/* Padding tombol simpan dikurangi */}
                        {saving && <Clock className="animate-spin w-4 h-4 mr-2" />}
                        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                </div>
            </main>
        </div>
    );
}