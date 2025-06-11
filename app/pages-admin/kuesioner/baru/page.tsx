'use client'

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import SidebarAdmin from '@/components/SidebarAdmin';
import { FilePlus2, ChevronDown } from 'lucide-react'; // Import ChevronDown
import { useRouter } from 'next/navigation';

// TypeScript interface (bisa diimpor dari file utama jika sudah ada)
interface KuesionerFormData {
    judul: string;
    deskripsi: string | null;
    tanggal_mulai: string;
    tanggal_selesai: string;
    status: 'draft' | 'active' | 'completed' | ''; // Memungkinkan string kosong untuk placeholder
}

const TambahKuesionerPage = () => {
    const [formData, setFormData] = useState<KuesionerFormData>({
        judul: '',
        deskripsi: '',
        tanggal_mulai: '',
        tanggal_selesai: '',
        status: '', // Nilai awal diubah menjadi string kosong
    });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { error: insertError } = await supabase
                .from('kuesioner')
                .insert([formData]);

            if (insertError) throw insertError;

            alert('Kuesioner baru berhasil ditambahkan!');
            router.push('/pages-admin/kuesioner'); // Arahkan ke daftar kuesioner setelah berhasil
        } catch (err: any) {
            setError(err.message);
            alert('Gagal menambahkan kuesioner: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen theme-admin">
            <SidebarAdmin />
            <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto">
                <div className="w-full max-w-5xl mx-auto"> {/* Max width diubah dari 4xl menjadi 5xl */}
                    <header className="mb-8">
                        <h1 className="text-2xl font-bold text-foreground flex items-center">
                            <FilePlus2 className="mr-3 w-6 h-6 text-primary" />
                            Buat Kuesioner
                        </h1>
                    </header>

                    {error && (
                        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md mb-6">
                            {error}
                        </div>
                    )}

                    <div className="bg-card text-card-foreground p-6 rounded-xl shadow-lg border border-border">
                        <form onSubmit={handleSubmit} className="space-y-5"> {/* Mengurangi spasi vertikal antar grup form */}
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="judul">Judul Kuesioner</label>
                                <input id="judul" name="judul" type="text" value={formData.judul} onChange={handleChange} className="border-input bg-background text-foreground shadow-sm appearance-none border rounded-md w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="deskripsi">Deskripsi</label>
                                <textarea id="deskripsi" name="deskripsi" value={formData.deskripsi || ''} onChange={handleChange} className="border-input bg-background text-foreground shadow-sm appearance-none border rounded-md w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring min-h-[80px]" rows={3} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5"> {/* Mengurangi spasi antar kolom tanggal */}
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="tanggal_mulai">Tanggal Mulai</label>
                                    <input id="tanggal_mulai" name="tanggal_mulai" type="datetime-local" value={formData.tanggal_mulai} onChange={handleChange} className="border-input bg-background text-foreground shadow-sm appearance-none border rounded-md w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="tanggal_selesai">Tanggal Selesai</label>
                                    <input id="tanggal_selesai" name="tanggal_selesai" type="datetime-local" value={formData.tanggal_selesai} onChange={handleChange} className="border-input bg-background text-foreground shadow-sm appearance-none border rounded-md w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="status">Status</label>
                                <div className="relative">
                                    <select
                                        id="status"
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className={`border-input bg-background shadow-sm appearance-none border rounded-md w-full py-2 px-3 pr-8 leading-tight focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring h-[38px] ${formData.status === '' ? 'text-gray-400' : 'text-foreground'}`}
                                        required
                                    >
                                        <option value="" disabled>Pilih status kuesioner</option>
                                        <option value="active" className="text-black">Active</option>
                                        <option value="draft" className="text-black">Draft</option>
                                        <option value="completed" className="text-black">Completed</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-4"> {/* Menambah padding atas untuk grup tombol */}
                                <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors">
                                    Batal
                                </button>
                                <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    {loading ? 'Menyimpan...' : 'Simpan Kuesioner'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TambahKuesionerPage;