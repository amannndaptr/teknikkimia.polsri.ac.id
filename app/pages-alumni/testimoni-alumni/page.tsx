'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Pencil, Trash2, PlusCircle, Search, UserCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image'; // Renamed to avoid conflict with Lucide's Image
import SidebarAlumni from '@/components/SidebarAlumni';

interface TestimoniAlumniItem {
    id: string;
    photo_url: string | null;
    nama_alumni: string;
    prodi: string;
    angkatan: string;
    testimoni: string;
    created_at: string;
    updated_at: string | null;
    alumni_id: number | null; // Tambahkan ini sesuai skema tabel
}

const BUCKET_NAME = 'alumni-photos'; // Ganti dengan nama bucket Supabase Storage Anda untuk foto alumni
const TABLE_NAME = 'testimoni_alumni'; // Pastikan nama tabel ini sesuai di Supabase

export default function TestimoniAlumniManagementPage() {
    const [testimoniList, setTestimoniList] = useState<TestimoniAlumniItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [currentAlumniId, setCurrentAlumniId] = useState<number | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const initPage = async () => {
            setLoading(true);
            setError(null);
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (authUser) {
                // Fetch the alumni.id based on authUser.id
                const { data: alumniProfile, error: alumniError } = await supabase
                    .from('alumni')
                    .select('id') // Ini adalah alumni.id (integer)
                    .eq('user_id', authUser.id) // Asumsi 'user_id' di tabel 'alumni' terhubung ke auth.users.id
                    .single();

                if (alumniError) {
                    console.error('Error fetching alumni profile:', alumniError);
                    setError('Gagal memuat profil alumni Anda untuk menampilkan testimoni.');
                    setLoading(false);
                    return;
                }

                if (alumniProfile) {
                    setCurrentAlumniId(alumniProfile.id);
                    await fetchTestimoniForAlumni(alumniProfile.id);
                } else {
                    setError('Profil alumni tidak ditemukan. Tidak dapat menampilkan testimoni.');
                    setTestimoniList([]);
                    setLoading(false);
                }
            } else {
                setError('Anda harus login untuk melihat testimoni Anda.');
                setTestimoniList([]);
                // router.push('/login'); // Opsional: arahkan ke login
                setLoading(false);
            }
        };
        initPage();
    }, []);

    async function fetchTestimoniForAlumni(alumniId: number) {
        // setLoading dan setError sudah diatur di initPage
        const { data, error: dbError } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('alumni_id', alumniId) // Filter berdasarkan alumni_id yang login
            .order('created_at', { ascending: false });

        if (dbError) {
            console.error('Error fetching testimoni alumni:', dbError);
            setError('Gagal memuat data testimoni Anda. Coba lagi nanti.');
            setTestimoniList([]);
        } else {
            setTestimoniList(data || []);
        }
        setLoading(false);
    }
    async function deleteTestimoni(item: TestimoniAlumniItem) {
        if (confirm(`Apakah Anda yakin ingin menghapus testimoni dari "${item.nama_alumni}"?`)) {
            setLoading(true);
            // 1. Delete photo from Supabase Storage (if exists)
            if (item.photo_url) {
                let imagePath = '';
                try {
                    const url = new URL(item.photo_url);
                    const pathSegments = url.pathname.split('/');
                    const bucketIndex = pathSegments.indexOf(BUCKET_NAME);
                    if (bucketIndex !== -1 && bucketIndex + 1 < pathSegments.length) {
                        imagePath = pathSegments.slice(bucketIndex + 1).join('/');
                    }
                } catch (e) {
                    console.error("Invalid photo URL for deletion:", item.photo_url);
                }

                if (imagePath) {
                    const { error: storageError } = await supabase.storage
                        .from(BUCKET_NAME)
                        .remove([imagePath]);

                    if (storageError) {
                        console.error('Error deleting photo from storage:', storageError);
                        alert(`Peringatan: Gagal menghapus file foto dari storage. Error: ${storageError.message}`);
                    }
                } else {
                    console.warn("Could not determine photo path for deletion from URL:", item.photo_url);
                }
            }

            // 2. Delete record from database
            const { error: dbError } = await supabase
                .from(TABLE_NAME)
                .delete()
                .eq('id', item.id);

            if (dbError) {
                console.error('Error deleting testimoni from database:', dbError);
                alert(`Gagal menghapus testimoni dari database. Error: ${dbError.message}`);
                setError(`Gagal menghapus testimoni. Error: ${dbError.message}`);
            } else {
                alert('Testimoni berhasil dihapus.');
                if (currentAlumniId) {
                    await fetchTestimoniForAlumni(currentAlumniId); // Refresh list untuk alumni saat ini
                }
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

    const filteredTestimoni = testimoniList.filter(item =>
        item.nama_alumni.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.testimoni.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.prodi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.angkatan.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen theme-alumni">
            <SidebarAlumni />
            <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                        <h1 className="text-3xl font-bold text-foreground">Testimoni Saya</h1>
                        <Link href="/pages-alumni/testimoni-alumni/create" passHref>
                            <button className={`flex items-center px-4 py-2 rounded-md shadow hover:shadow-md transition-all duration-200 text-sm font-medium
                                                bg-gradient-to-r from-[#A1C4FD] to-[#C2E9FB] hover:from-[#C2E9FB] hover:to-[#A1C4FD] text-white
                                                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400`}
                            >
                                <PlusCircle className="w-5 h-5 mr-2" />
                                <span>Tambah Testimoni</span>
                            </button>
                        </Link>
                    </div>

                    <div className="bg-card p-4 rounded-lg shadow-md mb-6 border border-border">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Cari berdasarkan nama, prodi, angkatan, atau isi testimoni..."
                                className="pl-10 pr-3 py-2 w-full border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring focus:outline-none text-sm"
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
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-4 text-muted-foreground">Memuat data testimoni...</p>
                        </div>
                    ) : filteredTestimoni.length === 0 ? (
                        <div className="p-8 text-center bg-card rounded-lg shadow-md border border-border">
                            <UserCircle className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">{searchTerm ? "Tidak ada testimoni yang cocok dengan pencarian Anda." : "Anda belum menambahkan testimoni."}</p>
                            {!searchTerm && <p className="text-sm text-muted-foreground/80 mt-1">Klik "Tambah Testimoni" untuk memulai.</p>}
                        </div>
                    ) : (
                        <div className="bg-card rounded-lg shadow-md overflow-hidden border border-border">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Foto</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Nama Alumni</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Prodi</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Angkatan</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Testimoni</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Dibuat</th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-card divide-y divide-border">
                                        {filteredTestimoni.map((item) => (
                                            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="w-12 h-12 relative rounded-full overflow-hidden bg-muted flex items-center justify-center">
                                                        {item.photo_url ? (
                                                            <NextImage src={item.photo_url} alt={item.nama_alumni} fill className="object-cover" sizes="48px" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}/>
                                                        ) : (
                                                            <UserCircle className="w-8 h-8 text-muted-foreground/70" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{item.nama_alumni}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{item.prodi}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{item.angkatan}</td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-muted-foreground line-clamp-3 max-w-sm">{item.testimoni}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate(item.created_at)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end space-x-3">
                                                        <button onClick={() => deleteTestimoni(item)} className="text-destructive hover:text-destructive/80" title="Hapus" disabled={loading}>
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