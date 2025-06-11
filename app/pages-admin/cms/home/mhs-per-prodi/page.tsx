'use client';

import { useState, useEffect } from 'react';
import { Save, ArrowLeft, Users, Loader } from 'lucide-react';
import SidebarAdmin from '@/components/SidebarAdmin'; // Import SidebarAdmin
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface JurusanStat {
    id: number;
    stat_type: 'program_studi' | 'tenaga_pendidik';
    name: string;
    count: number;
}

export default function EditJurusanStats() {
    const [stats, setStats] = useState<JurusanStat[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [saveStatus, setSaveStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch data dari Supabase saat komponen dimuat
    useEffect(() => {
        async function fetchData() {
            setIsFetching(true);
            setError(null);

            try {
                // Fetch semua data statistik jurusan
                const { data, error } = await supabase
                    .from('jurusan_stats')
                    .select('*')
                    .order('id');

                if (error) throw error;

                setStats(data);
            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Gagal mengambil data dari database');
            } finally {
                setIsFetching(false);
            }
        }

        fetchData();
    }, []);

    const handleCountChange = (id: number, value: string) => {
        setStats(prevStats =>
            prevStats.map(stat =>
                stat.id === id ? { ...stat, count: Number(value) } : stat
            )
        );
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setSaveStatus(null);
        setError(null);

        try {
            // Update semua data statistik
            const updates = stats.map(async (stat) => {
                const { error } = await supabase
                    .from('jurusan_stats')
                    .update({ count: stat.count })
                    .eq('id', stat.id);

                if (error) throw error;
            });

            // Execute all updates
            await Promise.all(updates);

            setSaveStatus('success');
        } catch (error) {
            console.error('Error updating data:', error);
            setError('Gagal menyimpan perubahan ke database');
            setSaveStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    // Memisahkan data program studi dan tenaga pendidik
    const prodiStats = stats.filter(stat => stat.stat_type === 'program_studi');
    const pendidikStats = stats.filter(stat => stat.stat_type === 'tenaga_pendidik');

    return (
        <div className="min-h-screen theme-admin">
            <SidebarAdmin />
            <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto">
                <div className="container mx-auto max-w-5xl"> {/* Diubah dari max-w-4xl menjadi max-w-5xl */}
                    {isFetching ? (
                        <div className="text-center py-20">
                            <Loader className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                            <p className="text-muted-foreground text-lg">Mengambil data...</p>
                        </div>
                    ) : error && !stats.length ? (
                        <div className="bg-destructive/10 border border-destructive text-destructive px-6 py-4 rounded-lg max-w-lg w-full mx-auto my-10 text-center">
                            <h3 className="font-bold text-xl mb-2">Terjadi Kesalahan</h3>
                            <p className="mb-4">{error}</p>
                            <button
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2 rounded-md font-medium"
                                onClick={() => window.location.reload()}
                            >
                                Coba Lagi
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center"> {/* Link dengan ikon ArrowLeft dihapus */}
                                    <h1 className="text-2xl font-bold text-foreground">
                                        Edit Statistik Jurusan
                                    </h1>
                                </div>
                            </div>
                            {saveStatus === 'success' && (
                                <div className="bg-green-100 dark:bg-green-500/20 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 px-4 py-3 rounded-md mb-6">
                                    Data berhasil disimpan.
                                </div>
                            )}

                            {saveStatus === 'error' && (
                                <div className="bg-red-100 dark:bg-red-500/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-md mb-6">
                                    {error || 'Gagal menyimpan data. Silakan coba lagi.'}
                                </div>
                            )}

                            {/* Wrapper untuk kedua card statistik */}
                            <div className="grid grid-cols-1 md:grid-cols-5 md:items-start gap-6 mb-6">
                                {/* Program Studi */}
                                <div className="bg-card text-card-foreground rounded-xl shadow-lg p-6 border border-border md:col-span-3">
                                    <h2 className="text-xl font-semibold mb-4 text-card-foreground">Program Studi</h2>
                                    <div className="space-y-4">
                                        {prodiStats.map((stat) => (
                                            <div key={stat.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center flex-grow min-w-0 mr-4"> {/* Added flex-grow, min-w-0, mr-4 */}
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary mr-3 flex-shrink-0"> {/* Added flex-shrink-0 */}
                                                        <Users size={16} />
                                                    </div>
                                                    <span className="font-medium text-sm text-foreground truncate">{stat.name}</span> {/* Added truncate */}
                                                </div>
                                                <div className="flex items-center flex-shrink-0"> {/* Removed mt-2 sm:mt-0 */}
                                                    <span className="text-muted-foreground mr-2 text-sm whitespace-nowrap">Jumlah Mahasiswa:</span> {/* Added whitespace-nowrap */}
                                                    <input
                                                        type="number"
                                                        value={stat.count}
                                                        onChange={(e) => handleCountChange(stat.id, e.target.value)}
                                                        min="0"
                                                        className="w-24 p-2 border-input bg-background text-foreground shadow-sm rounded-md focus:ring-2 focus:ring-ring focus:border-ring focus:outline-none text-sm"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Kontainer untuk kolom kedua (Tenaga Pendidik dan Tombol Simpan) */}
                                <div className="space-y-6 md:col-span-2">
                                    {/* Tenaga Pendidik */}
                                    {pendidikStats.length > 0 && (
                                        <div className="bg-card text-card-foreground rounded-xl shadow-lg p-6 border border-border">
                                            <h2 className="text-xl font-semibold mb-4 text-card-foreground">Dosen dan Tenaga Pendidik</h2>
                                            <div className="space-y-4">
                                                {pendidikStats.map((stat) => (
                                                    <div key={stat.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                                                        <div className="flex items-center flex-grow min-w-0 mr-4">
                                                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary mr-3 flex-shrink-0">
                                                                <Users size={16} />
                                                            </div>
                                                            <span className="font-medium text-sm text-foreground">{stat.name}</span> {/* Dihapus: truncate */}
                                                        </div>
                                                        <div className="flex items-center flex-shrink-0">
                                                            <span className="text-muted-foreground mr-2 text-sm whitespace-nowrap">Jumlah:</span>
                                                            <input
                                                                type="number"
                                                                value={stat.count}
                                                                onChange={(e) => handleCountChange(stat.id, e.target.value)}
                                                                min="0"
                                                                className="w-24 p-2 border-input bg-background text-foreground shadow-sm rounded-md focus:ring-2 focus:ring-ring focus:border-ring focus:outline-none text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* Tombol Simpan Perubahan */}
                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleSubmit}
                                            disabled={isLoading}
                                            className={`flex items-center px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${isLoading
                                                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                                : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg'
                                                }`}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                                                    Menyimpan...
                                                </>
                                            ) : (
                                                "Simpan Perubahan"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}