// app/pages-admin/cms/kegiatan/page.tsx
'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { createClient } from '@/utils/supabase/client'; 
import { Pencil, Trash2, PlusCircle, Search, Image as ImageIcon, AlertTriangle, Activity, Images } from 'lucide-react'; // Ditambahkan Images
import Link from 'next/link';
import NextImage from 'next/image'; // Renamed to avoid conflict with Lucide's Image
import SidebarAdmin from '@/components/SidebarAdmin'; // Import SidebarAdmin

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
        <div className="min-h-screen theme-admin">
            <SidebarAdmin />
            <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto">
                <div className="max-w-7xl mx-auto"> {/* Container asli dipertahankan di dalam main */}
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-2xl font-bold text-foreground flex items-center">
                            <Images className="w-7 h-7 mr-3 text-primary" /> {/* Ikon diubah menjadi Images */}
                            Manajemen Kegiatan
                        </h1>
                        <Link href="/pages-admin/cms/info/kegiatan/create">
                            <button className="flex items-center bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md shadow hover:shadow-md transition-all duration-200 text-sm font-medium"> {/* Styling disesuaikan */}
                                <PlusCircle className="w-5 h-5 mr-2" />
                                <span>Tambah Kegiatan</span>
                            </button>
                        </Link>
                    </div>

                    <div className="bg-card p-4 rounded-lg shadow-md mb-6 border border-border"> {/* Styling disesuaikan */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" /> {/* Warna ikon disesuaikan */}
                            <input
                                type="text"
                                placeholder="cari kegiatan..."
                                className="pl-10 pr-3 py-2 w-full border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring focus:outline-none text-sm" // Styling input disesuaikan
                                value={searchTerm}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 border border-destructive text-destructive px-6 py-4 rounded-lg mb-6 text-sm" role="alert"> {/* Styling disesuaikan */}
                            <p className="font-bold flex items-center"><AlertTriangle className="w-5 h-5 mr-2"/>Error</p>
                            <p>{error}</p>
                        </div>
                    )}

                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div> {/* Warna spinner disesuaikan */}
                            <p className="mt-4 text-muted-foreground">Memuat data kegiatan...</p> {/* Warna teks disesuaikan */}
                        </div>
                    ) : filteredKegiatan.length === 0 ? (
                        <div className="p-8 text-center bg-card rounded-lg shadow-md border border-border"> {/* Styling disesuaikan */}
                            <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" /> {/* Warna ikon disesuaikan */}
                            <p className="text-muted-foreground">{searchTerm ? "Tidak ada kegiatan yang cocok dengan pencarian Anda." : "Belum ada kegiatan yang ditambahkan."}</p>
                            {!searchTerm && <p className="text-sm text-muted-foreground/80 mt-1">Klik "Tambah Kegiatan" untuk memulai.</p>}
                        </div>
                    ) : (
                        <div className="bg-card rounded-lg shadow-md overflow-hidden border border-border"> {/* Styling disesuaikan */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border"> {/* Styling tabel disesuaikan */}
                                    <thead className="bg-muted/50"> {/* Styling thead disesuaikan */}
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Gambar
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Deskripsi
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Dibuat
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Diperbarui
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-card divide-y divide-border"> {/* Styling tbody disesuaikan */}
                                        {filteredKegiatan.map((item) => (
                                            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="w-16 h-16 relative rounded-md overflow-hidden bg-muted"> {/* Latar belakang placeholder disesuaikan */}
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
                                                    <div className="text-sm text-foreground line-clamp-3 max-w-md"> {/* Warna teks disesuaikan */}
                                                        {item.description || <span className="italic text-muted-foreground/80">Tidak ada deskripsi</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                                    {formatDate(item.created_at)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                                    {item.updated_at && item.updated_at !== item.created_at ? formatDate(item.updated_at) : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end space-x-3">
                                                        <Link href={`/pages-admin/cms/info/kegiatan/edit/${item.id}`} className="text-primary hover:text-primary/80" title="Edit"> {/* Warna link disesuaikan */}
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