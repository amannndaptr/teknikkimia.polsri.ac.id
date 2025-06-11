"use client";

import { FC, useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";

interface VisiMisiKonten {
  id: string;
  judul_utama: string | null;
  paragraf_pengantar: string | null;
  judul_visi: string | null;
  isi_visi: string | null;
  judul_misi: string | null;
  poin_misi: string[]; // Array of strings
  updated_at?: string;
}

const KONTEN_ID = 'konten_utama'; // Harus sama dengan di CMS

const VisiMisi: FC = () => {
    const [konten, setKonten] = useState<VisiMisiKonten | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            const { data, error: fetchError } = await supabase
                .from('cms_visi_misi')
                .select('*')
                .eq('id', KONTEN_ID)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error("Error fetching Visi Misi content:", fetchError);
                setError("Gagal memuat konten Visi dan Misi.");
            } else {
                setKonten(data);
            }
            setLoading(false);
        };
        fetchData();
    }, [supabase]);

    const lastUpdatedDate = useMemo(() => {
        if (konten?.updated_at) {
            return new Date(konten.updated_at).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric'
            });
        }
        return "Belum ada data";
    }, [konten]);

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div><p className="ml-3">Memuat data...</p></div>;
    }

    if (error) {
        return <div className="container mx-auto p-4 text-center text-red-500">{error}</div>;
    }

    const defaultKonten: VisiMisiKonten = { // Fallback jika konten null
        id: KONTEN_ID,
        judul_utama: "Visi dan Misi Jurusan Teknik Kimia",
        paragraf_pengantar: "Menjadi institusi pendidikan unggulan di bidang industri proses yang siap bersaing secara global, berkarakter, dan berwawasan lingkungan.",
        judul_visi: "Visi",
        isi_visi: "Menjadi institusi penyelenggara pendidikan yang profesional di bidang industri proses yang mampu bersaing di era globalisasi.",
        judul_misi: "Misi",
        poin_misi: [
            "Menyelenggarakan pendidikan untuk menghasilkan lulusan yang memiliki profesionalisme tinggi, berkarakter, dan berwawasan lingkungan di bidang industri proses.",
            "Meningkatkan kualitas SDM dan melaksanakan penelitian terapan yang diarahkan pada permasalahan aktual industri proses, serta menyebarluaskan hasilnya untuk pengembangan ilmu pengetahuan dan teknologi.",
            "Melaksanakan kegiatan pengabdian kepada masyarakat melalui penerapan ilmu pengetahuan dan teknologi guna mendukung peningkatan mutu kehidupan masyarakat."
        ]
    };

    const displayKonten = konten || defaultKonten;

    return (
        <main className="bg-gradient-to-b from-gray-50 to-gray-200 min-h-screen py-8 px-6 md:px-10 font-sans">
            <section className="max-w-7xl mx-auto space-y-8">
                <header className="text-center space-y-8">
                    <h1 className="text-3xl font-bold text-maroon-700 mb-120 text-center">
                        {displayKonten.judul_utama}
                    </h1>
                    <p className="text-lg text-gray-700 text-justify">
                        {displayKonten.paragraf_pengantar}
                    </p>
                </header>

                {/* Visi */}
                <section className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
                    <h2 className="text-2xl font-bold text-maroon-700 mb-3">{displayKonten.judul_visi}</h2>
                    <p className="text-lg text-gray-700 text-justify">
                        {displayKonten.isi_visi}
                    </p>
                </section>

                {/* Misi */}
                <section className="bg-white shadow-md rounded-xl p-6 border border-gray-200 space-y-4">
                    <h2 className="text-2xl font-bold text-maroon-700">{displayKonten.judul_misi}</h2>
                    <ul className="list-disc list-inside space-y-4 text-gray-700 text-lg">
                        {displayKonten.poin_misi.map((poin, index) => (
                            <li key={index}>{poin}</li>
                        ))}
                    </ul>
                </section>
            </section>
        </main>
    );
};

export default VisiMisi;