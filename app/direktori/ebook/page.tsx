'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card'; // Removed BookOpen
import { DownloadCloud, Search, FileText } from 'lucide-react'; // Added FileText back, removed BookOpen
import { format } from 'date-fns';

interface DokumenDosenPublik {
    id: string;
    judul: string;
    kategori: string;
    nama_dosen: string | null;
    prodi_dosen: string | null;
    file_name_asli: string;
    file_url_publik: string;
    cover_image_url?: string | null; // Added cover_image_url as an optional property
    created_at: string;
}

// Interface for the nested dosen data from Supabase
interface SupabaseDosenData {
    nama: string | null;
    prodi: string | null;
}

// Interface for the raw document structure from Supabase
interface RawDokumenFromSupabase {
    id: string;
    judul: string;
    kategori: string;
    file_name_asli: string;
    file_url_publik: string;
    cover_image_url: string | null;
    created_at: string;
    dosen: SupabaseDosenData | SupabaseDosenData[] | null; // Can be single, array, or null
}

const SUPABASE_TABLE_NAME = 'penelitian_pengabdian'; // Pastikan ini sama dengan nama tabel Anda

const PREDEFINED_PRODI_OPTIONS = [
    "D3 Teknik Kimia",
    "D4 Teknik Energi",
    "D4 Teknologi Kimia Industri",
    "S2 Energi Terbarukan",
    "D3 Teknik Kimia PSDKU Siak"
];
const PREDEFINED_KATEGORI_OPTIONS = [ // Tambahkan ini
    "Penelitian dan Pengabdian",
    "Materi Pembelajaran",
    // Tambahkan kategori lain yang selalu ingin ditampilkan di sini
];

const EbookPage = () => {
    const [dokumenList, setDokumenList] = useState<DokumenDosenPublik[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // State untuk input field pencarian (nilai langsung)
    const [searchInput, setSearchInput] = useState(''); 
    // State untuk searchTerm yang sudah di-debounce, yang akan memicu fetch
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(''); 

    const [expandedTitles, setExpandedTitles] = useState<Set<string>>(new Set());
    const [selectedKategori, setSelectedKategori] = useState<string>('');
    const [selectedProdi, setSelectedProdi] = useState<string>('');

    const supabase = createClient();

    // useEffect untuk debounce searchTerm
    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchTerm(searchInput);
        }, 500); // Atur delay debounce, misal 500ms

        return () => {
            clearTimeout(timerId);
        };
    }, [searchInput]);

    useEffect(() => {
        fetchDokumenPublik();
    }, [debouncedSearchTerm, selectedKategori, selectedProdi]); // Re-fetch ketika filter (termasuk debouncedSearchTerm) berubah

    useEffect(() => {
        console.log("[DEBUG] PREDEFINED_PRODI_OPTIONS:", PREDEFINED_PRODI_OPTIONS);
    }, []);

    const fetchDokumenPublik = async () => {
        setLoading(true);
        setError(null);
        try {
            // Base select string for dosen (behaves like a left join by default)
            let dosenSelectPart = `
                dosen (
                    nama,
                    prodi
                )
            `;

            // If filtering by prodi, modify the dosen select part to enforce an inner join.
            // This ensures that only documents with a related 'dosen' record that matches the prodi filter
            // will be returned.
            if (selectedProdi) {
                dosenSelectPart = `
                    dosen!inner (
                        nama,
                        prodi
                    )
                `;
            }

            const selectString = `
                id,
                judul,
                kategori,
                file_name_asli,
                file_url_publik,
                cover_image_url,
                created_at,
                ${dosenSelectPart}
            `.trim();

            let query = supabase
                .from(SUPABASE_TABLE_NAME)
                .select(selectString)
                .order('created_at', { ascending: false });

            // Terapkan filter di sisi server
            if (debouncedSearchTerm) {
                // Mencari di judul ATAU kategori dokumen
                query = query.or(`judul.ilike.%${debouncedSearchTerm}%,kategori.ilike.%${debouncedSearchTerm}%`);
            }
            if (selectedKategori) {
                query = query.eq('kategori', selectedKategori);
            }
            if (selectedProdi) {
                // Filter berdasarkan prodi dosen dari tabel 'dosen' yang direlasikan
                // Pastikan nama kolom 'prodi' di tabel 'dosen' sudah benar
                // UBAH SEMENTARA KE ILIKE UNTUK DIAGNOSIS CASE-INSENSITIVE
                // Dengan dosen!inner di select, filter ini akan bekerja pada hasil join yang lebih ketat.
                query = query.ilike('dosen.prodi', `%${selectedProdi}%`);
                // Jika Anda menginginkan pencocokan yang persis (case-insensitive karena ILIKE), Anda bisa hilangkan '%': query.ilike('dosen.prodi', selectedProdi);
                console.log(`[DEBUG] Menerapkan filter prodi (ILIKE) ke Supabase: '%${selectedProdi}%' pada ${dosenSelectPart.includes('!inner') ? 'dosen!inner' : 'dosen'}`);
            }

            const { data: responseData, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            let validRawDocs: RawDokumenFromSupabase[] = [];

            if (responseData && Array.isArray(responseData)) {
                // Log the raw array data before filtering if needed for debugging
                // console.log('[DEBUG] Raw responseData array from Supabase:', responseData);

                // Filter out any items that don't conform to RawDokumenFromSupabase structure
                // or might be error objects within the data array.
                // A type guard checks for key properties of RawDokumenFromSupabase
                // Casting responseData to any[] helps the type guard correctly type the filter's output.
                validRawDocs = (responseData as any[]).filter(
                    (item: any): item is RawDokumenFromSupabase =>
                        item &&
                        typeof item.id === 'string' &&
                        typeof item.judul === 'string' && // Ensure this is a defining property
                        // Add other essential property checks if necessary
                        item.error !== true // Explicitly exclude items that look like errors
                );

                if (validRawDocs.length !== responseData.length) {
                    console.warn('[DEBUG] Some items in responseData were filtered out as they did not match RawDokumenFromSupabase structure or appeared to be error objects. Original count:', responseData.length, 'Filtered count:', validRawDocs.length);
                }

                if (validRawDocs.length > 0) {
                    console.log("[DEBUG] Detail Prodi dari validRawDocs (setelah filter internal):");
                    validRawDocs.forEach((doc, index) => { // doc is now safely RawDokumenFromSupabase
                        const dosenProdi = Array.isArray(doc.dosen) ? doc.dosen[0]?.prodi : doc.dosen?.prodi;
                        console.log(`  Dokumen ${index + 1} (ID: ${doc.id}): Prodi Dosen dari DB = '${dosenProdi}'`);
                    });
                }
            } else if (responseData) {
                // responseData is truthy but not an array (e.g., a single error object like GenericStringError)
                console.warn('[DEBUG] responseData from Supabase was not an array, possibly an error object:', responseData);
                // You might want to set an error state here if this indicates a problem not caught by fetchError
            }
            // If responseData was null, validRawDocs remains an empty array.

            const mappedData = validRawDocs.map((doc: RawDokumenFromSupabase) => { // doc is RawDokumenFromSupabase
                const dosenRelation = doc.dosen;
                let dosenInfoStructured: SupabaseDosenData | null = null;

                if (dosenRelation) {
                    dosenInfoStructured = Array.isArray(dosenRelation) ? dosenRelation[0] : dosenRelation;
                }

                return {
                    id: doc.id,
                    judul: doc.judul,
                    kategori: doc.kategori,
                    file_name_asli: doc.file_name_asli,
                    file_url_publik: doc.file_url_publik,
                    cover_image_url: doc.cover_image_url, 
                    created_at: doc.created_at,
                    nama_dosen: dosenInfoStructured?.nama || 'N/A',
                    prodi_dosen: dosenInfoStructured?.prodi || 'N/A',
                };
            }); // .map on an empty array results in an empty array, so || [] is not strictly needed here.
            console.log('[DEBUG] Data setelah mapping (akan ditampilkan):', mappedData);
            setDokumenList(mappedData); // mappedData should now correctly conform to DokumenDosenPublik[]

        } catch (err: any) {
            console.error("Error fetching public dokumen:", err.message);
            setError(`Gagal memuat daftar dokumen: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // filteredDokumen sekarang adalah dokumenList karena filter sudah di server
    // Gabungkan kategori dari data dengan kategori yang sudah ditentukan, lalu buat unik
    const uniqueKategori = Array.from(
        new Set([...PREDEFINED_KATEGORI_OPTIONS, ...dokumenList.map(doc => doc.kategori).filter(Boolean)])
    ).sort(); // Opsional: urutkan kategori

    // const uniqueProdi = Array.from(new Set(dokumenList.map(doc => doc.prodi_dosen).filter(Boolean as (item: string | null) => item is string))); // Tidak digunakan lagi, diganti PREDEFINED_PRODI_OPTIONS


    const handleTitleClick = (docId: string) => {
        setExpandedTitles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(docId)) {
                newSet.delete(docId); // Allow toggling back to clamped
            } else {
                newSet.add(docId);
            }
            return newSet;
        });
    };

    return (
        <main className="bg-gradient-to-b from-gray-50 to-gray-200 min-h-screen py-8 px-4 md:px-8 font-sans">
            <div className="container mx-auto">
                <div className="text-center mb-6"> {/* Mengurangi margin bawah dari mb-12 ke mb-6 */}
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">E-Book dan Materi Pembelajaran</h1>
                    <p className="text-lg text-gray-600 mt-2 mx-auto">Temukan berbagai materi pembelajaran, hasil penelitian, dan pengabdian dari dosen Teknik Kimia.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md shadow">
                        {error}
                    </div>
                )}

                <Card className="shadow-xl">
                    <CardHeader>
                        {/* Filter Section Start */}
                        <div className="space-y-4"> {/* Menghapus mt-6 dan sedikit mengurangi space-y */}
                            {/* Baris 1: Input Pencarian */}
                            <div className="relative">
                                <label htmlFor="search-term" className="sr-only">Pencarian</label>
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="search-term"
                                    type="text"
                                    placeholder="Ketik judul, atau kategori..."
                                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-maroon-500 focus:border-transparent transition-all"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                />
                            </div>

                            {/* Filter Kategori */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-gray-700">Kategori</h3>
                                    {selectedKategori && (
                                        <button
                                            onClick={() => setSelectedKategori('')}
                                            className="text-xs text-maroon-600 hover:underline focus:outline-none"
                                        >
                                            Reset Kategori
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {uniqueKategori.map(kat => (
                                        <button
                                            key={kat}
                                            onClick={() => setSelectedKategori(selectedKategori === kat ? '' : kat)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ease-in-out
                                                ${selectedKategori === kat
                                                    ? 'bg-maroon-100 text-maroon-700 font-semibold ring-2 ring-maroon-500 shadow-md'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm border border-gray-200 hover:border-gray-300'}`}
                                        >
                                            {kat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Filter Program Studi */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-gray-700">Program Studi</h3>
                                    {selectedProdi && (
                                        <button
                                            onClick={() => setSelectedProdi('')}
                                            className="text-xs text-maroon-600 hover:underline focus:outline-none"
                                        >
                                            Reset Prodi
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {PREDEFINED_PRODI_OPTIONS.map(prodi => (
                                        <button
                                            key={prodi}
                                            onClick={() => setSelectedProdi(selectedProdi === prodi ? '' : prodi)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ease-in-out
                                                ${selectedProdi === prodi
                                                    ? 'bg-maroon-100 text-maroon-700 font-semibold ring-2 ring-maroon-500 shadow-md'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm border border-gray-200 hover:border-gray-300'}`}
                                        >
                                            {prodi}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {/* Filter Section End */}
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-10 text-gray-500">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-current border-r-transparent"></div>
                                <p className="mt-3 text-sm">Memuat dokumen...</p>
                            </div>
                        ) : dokumenList.length === 0 ? ( // Menggunakan dokumenList langsung
                            <p className="text-center py-10 text-gray-500 bg-gray-50 rounded-md">
                                {debouncedSearchTerm || selectedKategori || selectedProdi ? "Tidak ada dokumen yang cocok dengan filter Anda." : "Belum ada dokumen yang tersedia."}
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 py-6">
                                {dokumenList.map((doc) => (
                                    <div key={doc.id} className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col group">
                                        {/* Image/Preview Area - Tinggi disesuaikan */}
                                        <div className="relative h-56 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                            {doc.cover_image_url ? (
                                                <img
                                                    src={doc.cover_image_url}
                                                    alt={`Sampul ${doc.judul}`}
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <FileText className="w-20 h-20 text-gray-300 transition-transform duration-300 group-hover:scale-110" />
                                            )}
                                            {/* Category Badge with conditional styling */}
                                            {doc.kategori && (
                                                <span
                                                    className={`absolute top-2 left-2 text-xs font-semibold px-2.5 py-1 rounded-full shadow-md ring-1 ring-black/10
                                                        ${doc.kategori === "Materi Pembelajaran"
                                                            ? 'bg-yellow-400 text-yellow-800' // Yellow for Materi Pembelajaran
                                                            : doc.kategori === "Penelitian dan Pengabdian"
                                                                ? 'bg-green-500 text-white' // Green for Penelitian dan Pengabdian
                                                                : 'bg-maroon-700 text-white' // Default maroon
                                                        }
                                                        ${(doc.kategori === "Materi Pembelajaran")
                                                            ? 'ring-yellow-500/30'
                                                            : 'ring-white/60' // Default ring or specific for other categories
                                                        }`}
                                                >
                                                    {doc.kategori}
                                                </span>
                                            )}
                                        </div>

                                        {/* Content Area */}
                                        <div className="p-4 flex flex-col flex-grow">
                                            <h3 
                                                className={`text-base font-semibold text-gray-800 mb-1 group-hover:text-maroon-700 transition-colors cursor-pointer ${
                                                    !expandedTitles.has(doc.id) ? 'line-clamp-2' : ''
                                                }`}
                                                title={doc.judul}
                                                onClick={() => handleTitleClick(doc.id)}
                                            >
                                                {doc.judul}
                                            </h3>
                                            {/* <p 
                                                className="text-xs text-gray-500 mb-3 line-clamp-1"
                                                title={doc.nama_dosen || 'Dosen tidak diketahui'}
                                            >
                                                 {doc.nama_dosen || 'N/A'}
                                            </p> */}
                                            {/* Container untuk Tanggal Unggah dan Tombol Unduh */}
                                            <div className="flex items-center justify-between text-xs mt-auto pt-3">
                                                <p className="text-gray-400">
                                                    Diupload: {format(new Date(doc.created_at), 'dd MMM yyyy')}
                                                </p>
                                                {doc.file_url_publik ? (
                                                    <a title={`Unduh ${doc.file_name_asli || doc.judul}`} href={doc.file_url_publik} target="_blank" rel="noopener noreferrer" download={doc.file_name_asli || doc.judul}>
                                                        <DownloadCloud className="h-6 w-6 text-blue-500 hover:text-blue-700 transition-colors" />
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 italic text-right">File tidak tersedia</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
};

export default EbookPage;