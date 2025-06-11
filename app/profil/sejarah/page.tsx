"use client";

import { FC, useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";

interface SejarahItem {
    id: string;
    tahun: string;
    keterangan: string | null;
    urutan: number | null;
    // Kolom deskriptif, opsional
    judul_utama?: string | null;
    paragraf_intro_1?: string | null;
    paragraf_intro_2?: string | null;
    judul_perjalanan_singkat?: string | null;
    paragraf_perjalanan_singkat?: string | null;
    created_at?: string; 
}

const DESKRIPSI_TAHUN_MARKER = 'DESKRIPSI_UMUM_SEJARAH'; // Harus sama dengan di CMS

const Sejarah: FC = () => {
    const [milestones, setMilestones] = useState<SejarahItem[]>([]);
    const [deskripsi, setDeskripsi] = useState<SejarahItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data: allItems, error: fetchError } = await supabase
                    .from('cms_sejarah')
                    .select('*') 
                    .order('urutan', { ascending: true })
                    .order('tahun', { ascending: true });

                if (fetchError) {
                    console.error("Error fetching sejarah data:", fetchError);
                    setError("Gagal memuat data halaman sejarah.");
                } else {
                    const deskripsiItem = allItems?.find(item => item.tahun === DESKRIPSI_TAHUN_MARKER) || null;
                    const regularMilestones = allItems?.filter(item => item.tahun !== DESKRIPSI_TAHUN_MARKER) || [];

                    setDeskripsi(deskripsiItem);
                    setMilestones(regularMilestones);
                }

            } catch (e) {
                console.error("Error fetching sejarah data:", e);
                setError("Terjadi kesalahan saat memuat data halaman sejarah.");
            }
            setLoading(false);
        };

        fetchData();
    }, [supabase]);

    const lastUpdatedDate = useMemo(() => {
        if (deskripsi?.created_at) { 
            return new Date(deskripsi.created_at).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric'
            });
        }
        return "Belum ada data";
    }, [deskripsi]);

    return (
        <main className="bg-gradient-to-b from-gray-50 to-gray-200 min-h-screen py-8 px-6 md:px-10 font-sans">
            <section className="max-w-7xl mx-auto space-y-8">
                <header className="text-center space-y-8">
                    <h1 className="text-3xl font-bold text-maroon-700 mb-12 text-center"> {/* mb-120 sepertinya typo, diganti mb-12 */}
                        {loading ? "Memuat judul..." : deskripsi?.judul_utama || "Sejarah Jurusan Teknik Kimia"}
                    </h1>
                    {loading ? (
                        <p className="text-lg text-gray-700 text-justify">Memuat deskripsi...</p>
                    ) : deskripsi ? (
                        <>
                            <p className="text-lg text-gray-700 text-justify">
                                {deskripsi.paragraf_intro_1 || "Program Studi Teknik Kimia Politeknik Negeri Sriwijaya telah membangun reputasinya sejak tahun 1982..."}
                            </p>
                            <p className="text-lg text-gray-700 text-justify">
                                {deskripsi.paragraf_intro_2 || "Dukungan fasilitas canggih seperti laboratorium reaksi kimia..."}
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-lg text-gray-700 text-justify">Program Studi Teknik Kimia Politeknik Negeri Sriwijaya telah membangun reputasinya sejak tahun <strong>1982</strong>...</p>
                            <p className="text-lg text-gray-700 text-justify">Dukungan fasilitas canggih seperti laboratorium reaksi kimia...</p>
                        </>
                    )}
                </header>

                <section className="w-full bg-white shadow-md rounded-xl p-6 space-y-4 border border-gray-200">
                    <h2 className="text-2xl font-bold text-maroon-700 mb-2">{loading ? "Memuat..." : deskripsi?.judul_perjalanan_singkat || "Perjalanan Sejarah Singkat"}</h2>
                    {loading ? <p className="text-gray-700 text-lg text-justify">Memuat...</p> : (
                        <p className="text-gray-700 text-lg text-justify">
                            {deskripsi?.paragraf_perjalanan_singkat || "Sejak didirikan, Teknik Kimia POLSRI terus menunjukkan perkembangan signifikan..."}
                        </p>
                    )}
                </section>

                <section className="max-w-7xl mx-auto space-y-14">
                    <h2 className="text-2xl md:text-3xl font-bold text-maroon-700 text-center">Tonggak Perkembangan</h2>
                    {loading && (
                        <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon-700 mx-auto"></div>
                            <p className="mt-2 text-gray-600">Memuat tonggak perkembangan...</p>
                        </div>
                    )}
                    {error && <p className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
                    {!loading && !error && milestones.length === 0 && (
                        <p className="text-center text-gray-600">Belum ada data tonggak perkembangan yang tersedia.</p>
                    )}
                    {!loading && !error && milestones.length > 0 && (
                        <div className="grid md:grid-cols-2 gap-6">
                            {milestones.map((item) => (
                                <div key={item.id} className="p-5 rounded-xl shadow-md border border-gray-200 bg-white">
                                    <h3 className="text-xl font-semibold text-maroon-800">{item.tahun}</h3>
                                    {item.keterangan && <p className="text-gray-700 mt-1">{item.keterangan}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </section>
        </main>
    );
};
export default Sejarah;