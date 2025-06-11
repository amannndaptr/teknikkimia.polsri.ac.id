'use client'

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import SidebarAdmin from '@/components/SidebarAdmin';
import { ListChecks, Edit, Trash2, Settings, PlusCircle, ChevronDown } from 'lucide-react'; // Import ChevronDown

// TypeScript interfaces
interface Kuesioner {
    id: string;
    judul: string;
    deskripsi: string | null;
    tanggal_mulai: string;
    tanggal_selesai: string;
    status: 'draft' | 'active' | 'completed';
    is_active: boolean;
}

const KuesionerAdmin = () => {
    const [kuesioners, setKuesioners] = useState<Kuesioner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formDataForEdit, setFormDataForEdit] = useState<Omit<Kuesioner, 'id' | 'is_active'>>({ judul: '', deskripsi: '', tanggal_mulai: '', tanggal_selesai: '', status: 'draft' }); // Untuk form edit

    const router = useRouter();
    const supabase = createClient();

    // Fetch kuesioner data
    const fetchKuesioners = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('kuesioner')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform data to include is_active property
            const transformedData = (data || []).map(item => ({
                ...item,
                is_active: item.status === 'active'
            }));

            setKuesioners(transformedData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKuesioners();
    }, []);

    // Handle form input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormDataForEdit(prev => ({ ...prev, [name]: value }));
    };

    // Handle form submission
    const handleUpdateSubmit = async (e: React.FormEvent) => { // Ganti nama fungsi
        e.preventDefault();
        try {
            if (editingId) {
                // Update existing kuesioner
                const { error } = await supabase
                    .from('kuesioner')
                    .update(formDataForEdit)
                    .eq('id', editingId);

                if (error) throw error;
                alert('Kuesioner berhasil diperbarui!');
            }
            resetForm();
            fetchKuesioners();
        } catch (err: any) {
            setError(err.message);
            alert('Gagal memperbarui kuesioner: ' + err.message);
        }
    };

    // Toggle kuesioner active status
    const handleToggleActive = async (id: string, currentStatus: string, isCurrentlyActive: boolean) => {
        setUpdatingStatus(id);

        try {
            // Determine the new status
            let newStatus: 'draft' | 'active' | 'completed';

            if (isCurrentlyActive) {
                // If currently active, set to draft
                newStatus = 'draft';
            } else {
                // If not currently active, set to active
                newStatus = 'active';
            }

            // Update the status in the database
            const { error } = await supabase
                .from('kuesioner')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            // Update the local state
            setKuesioners(prev =>
                prev.map(k =>
                    k.id === id
                        ? { ...k, status: newStatus, is_active: newStatus === 'active' }
                        : k
                )
            );
        } catch (err: any) {
            setError(`Gagal mengubah status: ${err.message}`);
        } finally {
            setUpdatingStatus(null);
        }
    };

    // Edit a kuesioner
    const handleEdit = (kuesioner: Kuesioner) => {
        setEditingId(kuesioner.id);
        setFormDataForEdit({
            judul: kuesioner.judul,
            deskripsi: kuesioner.deskripsi || '',
            tanggal_mulai: kuesioner.tanggal_mulai.substring(0, 16), // Format for datetime-local input
            tanggal_selesai: kuesioner.tanggal_selesai.substring(0, 16), // Format for datetime-local input
            status: kuesioner.status,
        });
    };

    // Delete a kuesioner
    const handleDelete = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus kuesioner ini?')) return;

        try {
            const { error } = await supabase
                .from('kuesioner')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchKuesioners();
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Navigate to kuesioner detail page
    const handleDetail = (id: string) => {
        router.push(`/pages-admin/kuesioner/${id}`);
    };

    // Reset form state
    const resetForm = () => {
        setEditingId(null);
        setFormDataForEdit({
            judul: '',
            deskripsi: '',
            tanggal_mulai: '',
            tanggal_selesai: '',
            status: 'draft',
        });
    };

    // Format date for display
    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
        } catch {
            return dateString;
        }
    };

    return (
        <div className="min-h-screen theme-admin">
            <SidebarAdmin />
            <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto">
                <div className="w-full max-w-7xl mx-auto">
                    {/* Header hanya ditampilkan jika tidak sedang dalam mode edit */}
                    {!editingId && (
                        <header className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4 sm:gap-0">
                            <h1 className="text-2xl font-bold text-foreground flex items-center">
                                <ListChecks className="mr-3 w-6 h-6 text-primary" />
                                Daftar Kuesioner
                            </h1>
                            {/* <button
                                onClick={() => router.push('/pages-admin/kuesioner/baru')}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md transition-colors flex items-center text-sm"
                            >
                                <PlusCircle className="w-4 h-4 mr-2" />
                                Buat Kuesioner Baru
                            </button> */}
                        </header>
                    )}

                    {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-4">
                    {error}
                    <button
                        className="float-right font-bold"
                        onClick={() => setError(null)}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Form Edit Kuesioner (muncul jika editingId ada) */}
            {editingId && (
                <>
                    <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center">
                        <Edit className="w-5 h-5 mr-2 text-primary"/> Edit Kuesioner
                    </h2>
                    <div className="bg-card text-card-foreground p-6 rounded-xl shadow-lg mb-6 border border-border">
                    <form onSubmit={handleUpdateSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="judul">
                                Judul Kuesioner
                            </label>
                            <input
                                id="judul"
                                name="judul"
                                type="text"
                                value={formDataForEdit.judul}
                                onChange={handleChange}
                                className="border-input bg-background text-foreground shadow-sm appearance-none border rounded-md w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="deskripsi">
                                Deskripsi
                            </label>
                            <textarea
                                id="deskripsi"
                                name="deskripsi"
                                value={formDataForEdit.deskripsi || ''}
                                onChange={handleChange}
                                className="border-input bg-background text-foreground shadow-sm appearance-none border rounded-md w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="tanggal_mulai">
                                    Tanggal Mulai
                                </label>
                                <input
                                    id="tanggal_mulai"
                                    name="tanggal_mulai"
                                    type="datetime-local"
                                    value={formDataForEdit.tanggal_mulai}
                                    onChange={handleChange}
                                    className="border-input bg-background text-foreground shadow-sm appearance-none border rounded-md w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="tanggal_selesai">
                                    Tanggal Selesai
                                </label>
                                <input
                                    id="tanggal_selesai"
                                    name="tanggal_selesai"
                                    type="datetime-local"
                                    value={formDataForEdit.tanggal_selesai}
                                    onChange={handleChange}
                                    className="border-input bg-background text-foreground shadow-sm appearance-none border rounded-md w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="status">
                                Status
                            </label>
                            <div className="relative">
                                <select
                                    id="status"
                                    name="status"
                                    value={formDataForEdit.status}
                                    onChange={handleChange}
                                    className="border-input bg-background text-foreground shadow-sm appearance-none border rounded-md w-full py-2 px-3 pr-8 leading-tight focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring h-[38px]"
                                    required
                                >
                                    <option value="draft" className="text-black">Draft</option>
                                    <option value="active" className="text-black">Active</option>
                                    <option value="completed" className="text-black">Completed</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 text-sm font-medium bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                            >
                                Update Kuesioner
                            </button>
                        </div>
                    </form>
                    </div>
                </>
            )}

            {/* Tabel Kuesioner (muncul jika editingId tidak ada) */}
            {!editingId && (
                <div className="rounded-xl border border-border shadow-lg">
                    <table className="w-full divide-y divide-border table-fixed">
                        <thead className="bg-muted">
                            <tr>
                                <th className="py-3 px-2 text-center text-sm font-medium text-muted-foreground uppercase tracking-wider w-[20%]">Judul</th>
                                <th className="py-3 px-2 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider w-[25%]">Deskripsi</th>
                                <th className="py-3 px-2 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider w-[15%]">Tanggal Mulai</th>
                                <th className="py-3 px-2 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider w-[15%]">Tanggal Selesai</th>
                                <th className="py-3 px-2 text-center text-sm font-medium text-muted-foreground uppercase tracking-wider w-[10%]">Status</th>
                                <th className="py-3 px-2 text-center text-sm font-medium text-muted-foreground uppercase tracking-wider w-[5%]">Aktif</th>
                                <th className="py-3 px-2 text-center text-sm font-medium text-muted-foreground uppercase tracking-wider w-[10%]">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-card">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-4 text-muted-foreground">Memuat data...</td>
                                </tr>
                            ) : kuesioners.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-4 text-muted-foreground">Belum ada data kuesioner.</td>
                                </tr>
                            ) : (
                                kuesioners.map((kuesioner) => (
                                    <tr key={kuesioner.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="py-3 px-2 text-sm text-foreground" title={kuesioner.judul}>{kuesioner.judul}</td>
                                        <td className="py-3 px-2 text-sm text-foreground" title={kuesioner.deskripsi || undefined}>{kuesioner.deskripsi || '-'}</td>
                                        <td className="py-3 px-2 whitespace-nowrap text-sm text-muted-foreground">{formatDate(kuesioner.tanggal_mulai)}</td>
                                        <td className="py-3 px-2 whitespace-nowrap text-sm text-muted-foreground">{formatDate(kuesioner.tanggal_selesai)}</td>
                                        <td className="py-3 px-2 whitespace-nowrap text-sm text-center">
                                            <span className={`px-2 py-1 inline-flex text-sm leading-5 font-semibold rounded-full 
                                                ${kuesioner.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300' :
                                                    kuesioner.status === 'completed' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                                                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300'}`}
                                            >
                                                {kuesioner.status === 'active' ? 'Aktif' :
                                                    kuesioner.status === 'completed' ? 'Selesai' : 'Draft'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                            <div className="relative inline-block w-10 align-middle select-none">
                                                <input
                                                    type="checkbox"
                                                    id={`toggle-${kuesioner.id}`}
                                                    className="sr-only peer"
                                                    checked={kuesioner.is_active}
                                                    disabled={updatingStatus === kuesioner.id || kuesioner.status === 'completed'}
                                                    onChange={() => handleToggleActive(kuesioner.id, kuesioner.status, kuesioner.is_active)}
                                                />
                                                <label
                                                    htmlFor={`toggle-${kuesioner.id}`}
                                                    className={`block h-6 rounded-full overflow-hidden cursor-pointer
                                                        ${kuesioner.status === 'completed' ? 'opacity-50 cursor-not-allowed bg-gray-300 dark:bg-gray-600' : 'bg-muted peer-checked:bg-primary'}
                                                        ${updatingStatus === kuesioner.id ? 'animate-pulse' : ''}
                                                        bg-muted peer-checked:bg-primary transition-colors`}
                                                >
                                                    <span
                                                        className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform
                                                            ${kuesioner.is_active ? 'translate-x-4' : 'translate-x-0'}`}
                                                    ></span>
                                                </label>
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 whitespace-nowrap text-sm text-center">
                                            <div className="flex items-center justify-center space-x-2">
                                                <button
                                                    onClick={() => handleDetail(kuesioner.id)}
                                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                    title="Kelola Pertanyaan"
                                                >
                                                    <Edit className="w-5 h-5"/>
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(kuesioner)}
                                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                    title="Edit Kuesioner"
                                                >
                                                    <Settings className="w-5 h-5"/>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(kuesioner.id)}
                                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                    title="Hapus Kuesioner"
                                                >
                                                    <Trash2 className="w-5 h-5"/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
                </div>
            </main>
        </div>
    );
};

export default KuesionerAdmin;