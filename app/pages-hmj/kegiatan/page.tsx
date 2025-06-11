// app/pages-hmj/kegiatan/page.tsx
'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { createClient } from '@/utils/supabase/client'; 
import { Pencil, Trash2, PlusCircle, Search, Image as ImageIcon, AlertTriangle, Activity, Images } from 'lucide-react'; // Ditambahkan Images
import Link from 'next/link';
import NextImage from 'next/image';
import SidebarHMJ from '@/components/SidebarHMJ'; // Import SidebarHMJ

interface KegiatanItem {
    id: string;
    image_urls: string[]; // Changed to array of strings
    description: string | null;
    created_at: string;
    updated_at: string | null;
}

const BUCKET_NAME = 'kegiatan-images'; // Ganti dengan nama bucket Supabase Storage Anda

export default function KegiatanManagementPage() {
    const [kegiatanList, setKegiatanList] = useState<KegiatanItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        fetchKegiatan();
    }, []);

    async function fetchKegiatan() {
        setLoading(true);
        setError(null);
        const { data, error: dbError } = await supabase
            .from('kegiatan') // Pastikan nama tabel ini sesuai
            .select('*')
            .order('created_at', { ascending: false });

        if (dbError) {
            console.error('Error fetching kegiatan:', dbError);
            setError('Gagal memuat data kegiatan. Coba lagi nanti.');
            setKegiatanList([]);
        } else {
            setKegiatanList(data || []);
        }
        setLoading(false);
    }

    async function deleteKegiatan(item: KegiatanItem) {
        if (confirm(`Apakah Anda yakin ingin menghapus kegiatan "${item.description || 'Tanpa Deskripsi'}"?`)) {
            setLoading(true);
            // 1. Delete images from Supabase Storage
            if (item.image_urls && item.image_urls.length > 0) {
                const imagePathsToDelete: string[] = [];
                for (const imageUrl of item.image_urls) {
                    try {
                        const url = new URL(imageUrl);
                        const pathSegments = url.pathname.split('/');
                        const bucketIndex = pathSegments.indexOf(BUCKET_NAME);
                        if (bucketIndex !== -1 && bucketIndex + 1 < pathSegments.length) {
                            imagePathsToDelete.push(pathSegments.slice(bucketIndex + 1).join('/'));
                        }
                    } catch (e) {
                        console.error("Invalid image URL for deletion:", imageUrl, e);
                    }
                }

                if (imagePathsToDelete.length > 0) {
                    const { error: storageError } = await supabase.storage
                        .from(BUCKET_NAME)
                        .remove(imagePathsToDelete);

                    if (storageError) {
                        console.error('Error deleting images from storage:', storageError);
                        alert(`Peringatan: Gagal menghapus beberapa file gambar dari storage. Error: ${storageError.message}`);
                        // Lanjutkan menghapus record dari database meskipun gambar gagal dihapus dari storage
                    }
                } else {
                    console.warn("Could not determine any image paths for deletion from URLs:", item.image_urls);
                }
            } else {
                console.log("No images to delete from storage for this item.");
            }

            // 2. Delete record from database
            const { error: dbError } = await supabase
                .from('kegiatan')
                .delete()
                .eq('id', item.id);

            if (dbError) {
                console.error('Error deleting kegiatan from database:', dbError);
                alert(`Gagal menghapus kegiatan dari database. Error: ${dbError.message}`);
                setError(`Gagal menghapus kegiatan dari database. Error: ${dbError.message}`);
            } else {
                alert('Kegiatan berhasil dihapus.');
                fetchKegiatan(); // Refresh the list
            }
            setLoading(false);
        }
    }

    function formatDate(dateString: string | null) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    const filteredKegiatan = kegiatanList.filter(item =>
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen theme-hmj"> {/* Mengganti tema dari 'theme-admin' ke 'theme-hmj' */}
            <SidebarHMJ />
            <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-gray-100 w-[calc(100%-18rem)] min-h-screen overflow-y-auto"> {/* Latar belakang utama diubah menjadi abu-abu sangat muda */}
                <div className="max-w-7xl mx-auto"> {/* Container asli dipertahankan di dalam main */}
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center"> {/* Warna teks judul diubah menjadi gelap agar terlihat */}
                            <Images className="w-7 h-7 mr-3 text-rose-700" /> {/* Ikon diubah menjadi Images, warna disesuaikan */}
                            Manajemen Kegiatan
                        </h1>
                        <Link href="/pages-hmj/kegiatan/create">
                            <button className="flex items-center bg-rose-700 text-white hover:bg-rose-800 px-4 py-2 rounded-md shadow hover:shadow-md transition-all duration-200 text-sm font-medium"> {/* Styling disesuaikan dengan tema rose */}
                                <PlusCircle className="w-5 h-5 mr-2" />
                                <span>Tambah Kegiatan</span>
                            </button>
                        </Link>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-md mb-6 border border-rose-500"> {/* Latar putih, border rose */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" /> {/* Warna ikon disesuaikan untuk kontras */}
                            <input
                                type="text"
                                placeholder="cari kegiatan..."
                                className="pl-10 pr-3 py-2 w-full border border-rose-300 bg-gray-50 text-gray-800 rounded-md focus:outline-none text-sm" // Menghapus efek focus border dan ring agar warna tetap sama
                                value={searchTerm}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 border border-destructive text-destructive px-6 py-4 rounded-lg mb-6 text-sm" role="alert">
                            <p className="font-bold flex items-center"><AlertTriangle className="w-5 h-5 mr-2"/>Error</p>
                            <p>{error}</p>
                        </div>
                    )}

                    {loading ? (
                        <div className="p-8 text-center"> {/* Warna spinner disesuaikan */}
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-700 mx-auto"></div> {/* Warna spinner disesuaikan dengan tema rose */}
                            <p className="mt-4 text-gray-600">Memuat data kegiatan...</p> {/* Teks muted disesuaikan untuk latar terang */}
                        </div>
                    ) : filteredKegiatan.length === 0 ? (
                        <div className="p-8 text-center bg-white rounded-lg shadow-md border border-rose-500"> {/* Latar putih, border rose */}
                            <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" /> {/* Ikon muted disesuaikan */}
                            <p className="text-gray-600">{searchTerm ? "Tidak ada kegiatan yang cocok dengan pencarian Anda." : "Belum ada kegiatan yang ditambahkan."}</p>
                            {!searchTerm && <p className="text-sm text-gray-500 mt-1">Klik "Tambah Kegiatan" untuk memulai.</p>}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-rose-500"> {/* Latar putih, border rose */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-rose-200"> {/* Pembatas baris rose muda */}
                                    <thead className="bg-rose-50"> {/* Latar header rose sangat muda */}
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-rose-800 uppercase tracking-wider"> {/* Teks header disesuaikan */}
                                                Gambar
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-rose-800 uppercase tracking-wider">
                                                Deskripsi
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-rose-800 uppercase tracking-wider">
                                                Dibuat
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-rose-800 uppercase tracking-wider">
                                                Diperbarui
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-rose-800 uppercase tracking-wider">
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-rose-200"> {/* Latar tbody putih, pembatas rose muda */}
                                        {filteredKegiatan.map((item) => (
                                            <tr key={item.id} className="hover:bg-rose-50/50 transition-colors"> {/* Hover dengan rose sangat muda */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="w-16 h-16 relative rounded-md overflow-hidden bg-gray-100"> {/* Latar placeholder abu-abu muda */}
                                                        <NextImage
                                                            src={(item.image_urls && item.image_urls.length > 0 ? item.image_urls[0] : '/placeholder-image.png')}
                                                            alt={item.description || 'Gambar Kegiatan Utama'}
                                                            fill
                                                            className="object-cover"
                                                            sizes="64px"
                                                            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-image.png'; }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-800 line-clamp-3 max-w-md"> {/* Teks utama gelap */}
                                                        {item.description || <span className="italic text-gray-500">Tidak ada deskripsi</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"> {/* Teks muted gelap */}
                                                    {formatDate(item.created_at)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"> {/* Teks muted gelap */}
                                                    {item.updated_at && item.updated_at !== item.created_at ? formatDate(item.updated_at) : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end space-x-3">
                                                        <Link href={`/pages-hmj/kegiatan/edit/${item.id}`} className="text-rose-600 hover:text-rose-700" title="Edit"> {/* Warna link disesuaikan dengan tema rose */}
                                                            <Pencil className="w-5 h-5" />
                                                        </Link>
                                                        <button onClick={() => deleteKegiatan(item)} className="text-destructive hover:text-destructive/80" title="Hapus" disabled={loading}> {/* Warna tombol disesuaikan */}
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}