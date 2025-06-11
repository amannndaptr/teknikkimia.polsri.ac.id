'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import SidebarDosen from '@/components/SidebarDosen'; // Pastikan path ini benar
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PresentationChartLineIcon } from '@heroicons/react/24/outline'; // Impor ikon
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { id } from 'date-fns/locale'; // Import locale for Indonesian date formatting

interface DosenData {
    id_dsn: string; // Assuming this is the UUID from the 'dosen' table
    nama: string;
}

interface Jawaban {
    id_kuesioner: string;
    id_pertanyaan: string;
    opsi_id: string | null; // ID of the selected Likert option
    // jawaban_teks is ignored for score calculation
}

interface Pertanyaan {
    id: string;
    jenis_jawaban: 'skala_likert' | 'text';
}

interface Opsi {
    id: string; // UUID of the option
    id_pertanyaan: string;
    nilai: number; // The numerical score value
}

interface Kuesioner {
    id: string;
    judul: string;
    tanggal_mulai: string;
}

interface ChartData {
    name: string; // Label for X-axis (e.g., Questionnaire Title + Date)
    averageScore: number | null; // Average score for Y-axis
}

export default function HasilEvaluasiDosenPage() {
    const [dosen, setDosen] = useState<DosenData | null>(null);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                // 1. Get Authenticated Dosen
                const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
                if (authError || !authUser) {
                    console.log("User not authenticated, redirecting...");
                    router.push('/sign-in'); // Redirect to login if not authenticated
                    return;
                }

                // Fetch Dosen data using the authenticated user's ID (assuming 'id_dsn' in 'dosen' table links to auth.users.id)
                const { data: dosenData, error: dosenError } = await supabase
                    .from('dosen')
                    .select('id_dsn, nama') // Select the correct ID column from 'dosen' table
                    .eq('id_dsn', authUser.id) // Match the foreign key to the auth user ID
                    .single();

                if (dosenError) throw new Error(`Gagal mengambil data dosen: ${dosenError.message}`);
                if (!dosenData) throw new Error('Data dosen tidak ditemukan untuk pengguna ini.');
                setDosen(dosenData);
                const targetDosenId = dosenData.id_dsn;
                console.log("Target Dosen ID:", targetDosenId); // <-- LOG 1: ID Dosen yang dicari

                // 2. Get All Answers for this Dosen
                const { data: jawabanData, error: jawabanError } = await supabase
                    .from('kuesioner_jawaban')
                    .select('kuesioner_id, pertanyaan_id, opsi_id') // Gunakan nama kolom yang benar: kuesioner_id, pertanyaan_id
                    // .select('*') // <-- DEBUG: Coba ambil semua kolom jawaban jika perlu
                    .eq('dosen_id', targetDosenId); // Filter jawaban berdasarkan id_dsn dosen yang login

                if (jawabanError) throw new Error(`Gagal mengambil jawaban: ${jawabanError.message}`);
                if (!jawabanData || jawabanData.length === 0) {
                    setChartData([]); // No evaluation data found
                    setLoading(false);
                    return;
                }
                console.log("Jawaban Data Mentah:", jawabanData); // <-- LOG 2: Lihat jawaban yang terambil

                // 3. Get Unique Kuesioner, Pertanyaan, and Opsi IDs
                const kuesionerIds = Array.from(new Set(jawabanData.map(j => j.kuesioner_id))); // Gunakan Array.from()
                const pertanyaanIds = Array.from(new Set(jawabanData.map(j => j.pertanyaan_id))); // Gunakan Array.from()
                const opsiIds = Array.from(new Set(jawabanData.map(j => j.opsi_id).filter(id => id !== null))) as string[]; // Gunakan Array.from()
                console.log("Opsi IDs yang akan dicari:", opsiIds); // <-- LOG 3: Lihat ID Opsi yang relevan

                // 4. Fetch Kuesioner Details
                const { data: kuesionersData, error: kuesionersError } = await supabase
                    .from('kuesioner')
                    .select('id, judul, tanggal_mulai')
                    .in('id', kuesionerIds);
                if (kuesionersError) throw new Error(`Gagal mengambil kuesioner: ${kuesionersError.message}`);
                console.log("Kuesioners Data:", kuesionersData); // <-- LOG 4: Lihat data kuesioner

                // 5. Fetch Pertanyaan Details (to know the type)
                const { data: pertanyaansData, error: pertanyaansError } = await supabase
                    .from('kuesioner_pertanyaan')
                    .select('id, jenis_jawaban')
                    .in('id', pertanyaanIds);
                if (pertanyaansError) throw new Error(`Gagal mengambil pertanyaan: ${pertanyaansError.message}`);
                const pertanyaanMap = new Map(pertanyaansData?.map(p => [p.id, p]));
                console.log("Pertanyaan Map:", pertanyaanMap); // <-- LOG 5: Lihat detail pertanyaan (terutama jenis_jawaban)

                // 6. Fetch Opsi Details (to get the numerical score 'nilai')
                const { data: opsisData, error: opsisError } = await supabase
                    .from('kuesioner_opsi')
                    .select('id, nilai') // Select ID and the score value
                    .in('id', opsiIds); // Fetch only the options that were actually selected
                if (opsisError) throw new Error(`Gagal mengambil opsi: ${opsisError.message}`);
                const opsiNilaiMap = new Map(opsisData?.map(o => [o.id, o.nilai])); // Map<opsi_id, nilai>
                console.log("Opsi Nilai Map:", opsiNilaiMap); // <-- LOG 6: Lihat map ID Opsi ke Nilai

                // 7. Process Data for Chart
                const processedData: ChartData[] = kuesionersData?.map(kuesioner => {
                    const relevantJawaban = jawabanData.filter(j => j.kuesioner_id === kuesioner.id); // Akses dengan nama kolom yang benar
                    let totalScore = 0;
                    let scoreCount = 0;

                    relevantJawaban.forEach(jawaban => {
                        const pertanyaan = pertanyaanMap.get(jawaban.pertanyaan_id);
                        // Only consider answers for Likert scale questions that have a selected option
                        if (pertanyaan?.jenis_jawaban === 'skala_likert' && jawaban.opsi_id) {
                            const score = opsiNilaiMap.get(jawaban.opsi_id);
                            // <-- LOG 7: Periksa setiap jawaban yang diproses
                            console.log(`Processing: Q_ID=${kuesioner.id}, P_ID=${jawaban.pertanyaan_id}, Opsi_ID=${jawaban.opsi_id}, Jenis=${pertanyaan?.jenis_jawaban}, Score=${score}`);
                            if (typeof score === 'number') {
                                totalScore += score;
                                scoreCount++;
                                console.log(`   -> Score added: ${score}`); // <-- LOG 8: Konfirmasi skor ditambahkan
                            } else {
                                console.warn(`Nilai tidak ditemukan untuk opsi ID: ${jawaban.opsi_id}`);
                            }
                        }
                    });

                    const averageScore = scoreCount > 0 ? totalScore / scoreCount : null;
                    const startDate = format(new Date(kuesioner.tanggal_mulai), 'dd MMM yyyy', { locale: id });

                    return {
                        name: `${kuesioner.judul} (${startDate})`, // X-axis label
                        averageScore: averageScore, // Y-axis value
                    };
                }).filter(item => item.averageScore !== null) // Only include questionnaires with valid scores
                    // .sort((a, b) => new Date(a.name.split('(')[1]).getTime() - new Date(b.name.split('(')[1]).getTime()) // Sort by date - Hati-hati jika format name berubah
                    .sort((a, b) => new Date(kuesionersData?.find(k => k.id === a.name.split(' ')[0])?.tanggal_mulai || 0).getTime() - new Date(kuesionersData?.find(k => k.id === b.name.split(' ')[0])?.tanggal_mulai || 0).getTime()) // Cara sorting yang lebih aman
                    || [];
                console.log("Processed Chart Data:", processedData); // <-- LOG 9: Lihat data akhir sebelum di set ke state

                setChartData(processedData);

            } catch (err: any) {
                setError(err.message || 'Terjadi kesalahan saat memuat data.');
                console.error("Error fetching evaluation results:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router, supabase]); // Dependencies

    return (
        <div className="flex min-h-screen bg-[#D1D9E6]"> {/* Menyamakan warna background halaman */}
            <SidebarDosen /> 
            <main className="flex-1 p-6 md:p-10">
                <div className="max-w-7xl mx-auto"> {/* Opsional: bungkus konten dengan max-width */}
                    <div className="flex items-center border-b pb-2 mb-6"> {/* Menambahkan border-b dan pb-2 untuk konsistensi */}
                        <PresentationChartLineIcon className="h-7 w-7 mr-2 text-gray-800" /> {/* Tambahkan ikon di sini */}
                        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Evaluasi Kinerja</h1>
                    </div>

                    {loading && <div className="text-center text-gray-500 py-10">Memuat data evaluasi...</div>}
                    {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">Error: {error}</div>}

                    {!loading && !error && (
                        <Card className="shadow-md bg-[#BAC3D0] border-gray-400"> {/* Menyamakan warna card dan menambahkan border */}
                            <CardHeader>
                            </CardHeader>
                            <CardContent>
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={400}>
                                        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 70 }}> {/* Increased bottom margin */}
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={80} tick={{ fontSize: 12 }} /> {/* Adjusted angle and font size */}
                                            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} /> {/* Assuming Likert scale values are mapped 0-100 */}
                                            <Tooltip formatter={(value: number) => [`${value.toFixed(2)}`, "Rata-rata Skor"]} />
                                            <Legend wrapperStyle={{ fontSize: '14px' }} />
                                            <Bar dataKey="averageScore" fill="#0d9488" name="Rata-rata Skor" barSize={30} /> {/* Warna disamakan dengan button settings (teal-700) */}
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-center text-gray-500 py-10">Belum ada data evaluasi kinerja yang dapat ditampilkan.</p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}