'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Save, ArrowLeft, Image as ImageIcon, UserCircle, AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import SidebarAlumni from '@/components/SidebarAlumni';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';

interface TestimoniAlumniData {
    id?: string;
    nama_alumni: string;
    prodi: string;
    angkatan: string;
    testimoni: string;
    photo_url: string | null;
    alumni_id?: number | null;
}

const BUCKET_NAME = 'alumni-photos';
const TABLE_NAME = 'testimoni_alumni';

export default function CreateTestimoniAlumniPage() {
    const router = useRouter();

    const [testimoniData, setTestimoniData] = useState<TestimoniAlumniData>({
        nama_alumni: '',
        prodi: '',
        angkatan: '',
        testimoni: '',
        photo_url: null,
        alumni_id: null,
    });
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loadingAlumniData, setLoadingAlumniData] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchAlumniData = async () => {
            setLoadingAlumniData(true);
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (authUser) {
                const { data: alumniProfile, error: alumniError } = await supabase
                    .from('alumni')
                    .select('id, nama, prodi, angkatan')
                    .eq('user_id', authUser.id)
                    .single();

                if (alumniError) {
                    console.error('Error fetching alumni profile for create testimoni:', alumniError);
                    setError('Gagal memuat data alumni Anda. Tidak dapat melanjutkan.');
                    setLoadingAlumniData(false);
                    return;
                }

                if (alumniProfile) {
                    setTestimoniData(prev => ({
                        ...prev,
                        alumni_id: alumniProfile.id,
                        nama_alumni: alumniProfile.nama || '',
                        prodi: alumniProfile.prodi || '',
                        angkatan: alumniProfile.angkatan?.toString() || '',
                    }));
                } else {
                    setError('Profil alumni tidak ditemukan. Tidak dapat membuat testimoni.');
                }
            } else {
                setError('Anda harus login untuk membuat testimoni.');
                // router.push('/login'); // Opsional
            }
            setLoadingAlumniData(false);
        };
        fetchAlumniData();
    }, [supabase, router]);

    const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
        setError(null);
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) { // Max 5MB
                setError('Ukuran file foto terlalu besar (maks 5MB).');
                return;
            }
            const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!acceptedImageTypes.includes(file.type)) {
                setError('Format file foto tidak didukung (JPG, PNG, WEBP).');
                return;
            }
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        } else {
            setPhotoFile(null);
            setPhotoPreview(null);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!testimoniData.alumni_id) {
            setError('Data alumni tidak termuat dengan benar. Tidak dapat menyimpan testimoni.');
            return;
        }
        if (!testimoniData.nama_alumni.trim()) {
            setError('Nama alumni wajib diisi.');
            return;
        }
        if (!testimoniData.prodi.trim()) {
            setError('Program studi wajib diisi.');
            return;
        }
        if (!testimoniData.angkatan.trim()) {
            setError('Angkatan wajib diisi.');
            return;
        }
        if (!testimoniData.testimoni.trim()) {
            setError('Isi testimoni wajib diisi.');
            return;
        }

        setSaving(true);
        let finalPhotoUrl: string | null = null;

        try {
            if (photoFile) {
                const fileName = `${Date.now()}-${photoFile.name.replace(/\s/g, '_')}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .upload(fileName, photoFile, { upsert: false });

                if (uploadError) throw new Error(`Gagal unggah foto: ${uploadError.message}`);
                
                const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path);
                if (!publicUrlData?.publicUrl) throw new Error('Gagal mendapatkan URL publik foto.');
                finalPhotoUrl = publicUrlData.publicUrl;
            }

            const dataToSave = {
                nama_alumni: testimoniData.nama_alumni.trim(),
                prodi: testimoniData.prodi.trim(),
                angkatan: testimoniData.angkatan.trim(),
                testimoni: testimoniData.testimoni.trim(),
                photo_url: finalPhotoUrl,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                alumni_id: testimoniData.alumni_id,
            };

            const { error: insertError } = await supabase
                .from(TABLE_NAME)
                .insert(dataToSave); 

            if (insertError) throw new Error(`Gagal tambah testimoni: ${insertError.message}`);
            
            setSuccess('Testimoni alumni berhasil ditambahkan!');
            setTestimoniData(prev => ({ ...prev, testimoni: '', photo_url: null }));
            setPhotoFile(null);
            setPhotoPreview(null);
            setTimeout(() => router.push('/pages-alumni/testimoni-alumni'), 1500);

        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loadingAlumniData) {
        return (
            <div className="min-h-screen theme-alumni">
                <SidebarAlumni />
                <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto flex justify-center items-center">
                    <div className="text-center">
                        <Loader2 className="animate-spin rounded-full h-12 w-12 text-sky-600 mx-auto" />
                        <p className="ml-3 mt-4 text-muted-foreground">Memuat data Anda...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen theme-alumni">
            <SidebarAlumni />
            <main className="ml-72 px-4 py-4 md:px-6 md:py-6 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto flex flex-col justify-center items-center">
                
                {/* Judul Halaman dan Tombol Kembali */}
                <div className="max-w-2xl w-full mb-4">
                    <div className="flex items-center">
                        <Link href="/pages-alumni/testimoni-alumni" className="text-muted-foreground hover:text-primary mr-2 p-1.5 rounded-full hover:bg-accent transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-xl font-semibold text-foreground">
                            Tambah Testimoni Baru
                        </h1>
                    </div>
                </div>

                {/* Kontainer Form */}
                <div className="max-w-2xl w-full bg-card p-5 md:p-6 rounded-lg shadow-xl border border-border">
                    {error && <div className="mb-4 p-3 bg-destructive/10 text-destructive border border-destructive/30 rounded-md flex items-center text-sm"><AlertTriangle className="w-5 h-5 mr-2" />{error}</div>}
                    {success && <div className="mb-4 p-3 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30 rounded-md flex items-center text-sm"><CheckCircle className="w-5 h-5 mr-2" />{success}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="nama_alumni" className="block text-sm font-medium text-muted-foreground mb-1">Nama Alumni</label>
                            <input type="text" id="nama_alumni" value={testimoniData.nama_alumni} onChange={(e) => setTestimoniData(prev => ({ ...prev, nama_alumni: e.target.value }))} className="w-full p-2 border-input bg-background text-foreground rounded-md shadow-sm focus:ring-2 focus:ring-ring focus:border-ring focus:outline-none text-sm" placeholder="Nama Anda" disabled />
                        </div>
                        <div>
                            <label htmlFor="prodi" className="block text-sm font-medium text-muted-foreground mb-1">Program Studi</label>
                            <input type="text" id="prodi" value={testimoniData.prodi} onChange={(e) => setTestimoniData(prev => ({ ...prev, prodi: e.target.value }))} className="w-full p-2 border-input bg-background text-foreground rounded-md shadow-sm focus:ring-2 focus:ring-ring focus:border-ring focus:outline-none text-sm" placeholder="Program Studi Anda" disabled />
                        </div>
                        <div>
                            <label htmlFor="angkatan" className="block text-sm font-medium text-muted-foreground mb-1">Angkatan (Tahun Masuk)</label>
                            <input type="text" id="angkatan" value={testimoniData.angkatan} onChange={(e) => setTestimoniData(prev => ({ ...prev, angkatan: e.target.value }))} className="w-full p-2 border-input bg-background text-foreground rounded-md shadow-sm focus:ring-2 focus:ring-ring focus:border-ring focus:outline-none text-sm" placeholder="Angkatan Anda" disabled/>
                        </div>
                        <div>
                            <label htmlFor="testimoni" className="block text-sm font-medium text-muted-foreground mb-1">Isi Testimoni</label>
                            <textarea id="testimoni" value={testimoniData.testimoni} onChange={(e) => setTestimoniData(prev => ({ ...prev, testimoni: e.target.value }))} rows={3} className="w-full p-2 border-input bg-background text-foreground rounded-md shadow-sm focus:ring-2 focus:ring-ring focus:border-ring focus:outline-none text-sm" placeholder="Tuliskan testimoni dari alumni..." />
                        </div>
                        <div>
                            <label htmlFor="photo" className="block text-sm font-medium text-muted-foreground mb-1">Foto Alumni (Opsional)</label>
                            <input type="file" id="photo" onChange={handlePhotoChange} accept="image/png, image/jpeg, image/webp" className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                            {photoPreview ? (
                                <div className="mt-4 border border-border rounded-md p-2 inline-block bg-muted/30">
                                    <NextImage src={photoPreview} alt="Preview Foto Alumni" width={100} height={100} className="rounded-md object-cover max-h-[100px]" />
                                </div>
                            ) : (
                                <div className="mt-4 p-2 inline-block border border-border rounded-md bg-muted/30">
                                    <UserCircle className="w-20 h-20 text-muted-foreground/50" />
                                </div>
                            )}
                            <p className="mt-1 text-xs text-muted-foreground/80">Format: JPG, PNG, WEBP. Maks: 5MB.</p>
                        </div>
                        <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                            <Link href="/pages-alumni/testimoni-alumni" className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted rounded-md hover:bg-muted/80 transition-colors">Batal</Link>
                            <button type="submit" disabled={saving} 
                                className={`px-4 py-2 text-sm font-medium rounded-md flex items-center transition-all duration-200 shadow hover:shadow-md
                                            bg-gradient-to-r from-[#A1C4FD] to-[#C2E9FB] hover:from-[#C2E9FB] hover:to-[#A1C4FD] text-white
                                            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400 disabled:opacity-70`}
                            >
                                {saving && <Clock className="animate-spin w-4 h-4 mr-2" />}
                                {saving ? 'Menyimpan...' : 'Simpan Testimoni'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
