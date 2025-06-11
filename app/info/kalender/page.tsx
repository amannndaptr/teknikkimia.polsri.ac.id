'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

// Card components are no longer needed for displaying a list, but keeping Card import just in case other parts rely on it, although not used in render.
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Table components are no longer needed for displaying a list, but keeping Card for structure
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Link as LinkIcon, DownloadCloud, Image as ImageIcon } from 'lucide-react'; // Icons for file, external link, and image

// TypeScript interface for the table data
interface KalenderAkademik {
    id: string;
    tahun_ajaran: string;
    file_url: string;
    created_at: string;
    updated_at: string;
}

const KalenderAkademikPublicPage = () => {
    // State to hold the single latest calendar
    const [latestKalender, setLatestKalender] = useState<KalenderAkademik | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    // --- Fetch the latest calendar ---
    useEffect(() => {
        fetchLatestKalender();
    }, []);

    const fetchLatestKalender = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch the single latest calendar entry
            const { data, error } = await supabase
                .from('kalender_akademik')
                .select('*')
                .order('tahun_ajaran', { ascending: false }) // Assuming higher year means newer
                .limit(1) // Get only the latest one
                .single(); // Expecting a single result

            if (error && error.code !== 'PGRST116') { // PGRST116 means "No rows found"
                throw error;
            }

            // If data is null, it means no calendars were found (handled by PGRST116)
            setLatestKalender(data);

        } catch (err: any) {
            console.error("Error fetching latest calendar:", err.message);
            setError(`Gagal memuat kalender terbaru: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Helper function to generate Polsri URL format
    const generatePolsriUrl = (tahunAjaran: string): string | null => {
        // Expects format "YYYY/YYYY"
        const years = tahunAjaran.split('/');
        if (years.length === 2 && /^\d{4}$/.test(years[0]) && /^\d{4}$/.test(years[1])) {
            return `https://www.polsri.ac.id/kalender-akademik-${years[0]}-${years[1]}/`;
        }
        return null; // Return null if format is unexpected
    };

    // Helper to check if the file URL is for an image
    const isImageUrl = (fileUrl: string | null): boolean => {
        if (!fileUrl) return false;
        const lowerCaseUrl = fileUrl.toLowerCase();
        return lowerCaseUrl.endsWith('.jpg') || lowerCaseUrl.endsWith('.jpeg') || lowerCaseUrl.endsWith('.png');
    };

    // Helper to check if the file URL is for a PDF
    const isPdfUrl = (fileUrl: string | null): boolean => {
        if (!fileUrl) return false;
        return fileUrl.toLowerCase().endsWith('.pdf');
    };


    return (
        // Apply the same background gradient and padding as LaboratoriumAnalisis main
        <main className="bg-gradient-to-b from-gray-50 to-gray-200 min-h-screen py-8 px-6 md:px-10 font-sans">
            {/* Use a container for centering and max-width */}
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Main Title - Consistent Style */}
                <h1 className="text-3xl font-bold text-maroon-700 mb-2 text-center">
                    Kalender Akademik
                </h1>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                        {error}
                    </div>
                )}

                {/* Latest Calendar Display - Removed Card Wrapper */}
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                        <p className="mt-2 text-sm">Memuat kalender terbaru...</p>
                    </div>
                ) : !latestKalender ? (
                    <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-md">
                        <p>Belum ada kalender akademik yang tersedia saat ini.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Section Title for the Calendar Content */}
                        {/* Adjusted style to be a standard heading, not CardTitle */}
                        {/* Action Links */}
                        <div className="flex flex-wrap justify-center gap-4">
                            {/* Link to download/view the file - Consistent Link Style */}
                            <a
                                href={latestKalender.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center font-medium text-sm" // Added text-sm
                                // Add download attribute for direct download attempt
                                download={`Kalender_Akademik_${latestKalender.tahun_ajaran}.${latestKalender.file_url.split('.').pop()}`}
                            >
                                <DownloadCloud className="h-5 w-5 mr-1" /> Unduh / Lihat File
                            </a>

                            {/* Link to Polsri website format - Consistent Link Style */}
                            {generatePolsriUrl(latestKalender.tahun_ajaran) ? (
                                <a
                                    href={generatePolsriUrl(latestKalender.tahun_ajaran)!} // Use non-null assertion after check
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-600 hover:underline flex items-center font-medium text-sm" // Added text-sm
                                >
                                    Tautan Polsri <LinkIcon className="h-5 w-5 ml-1" />
                                </a>
                            ) : (
                                <span className="text-muted-foreground text-sm flex items-center">
                                    Tautan Polsri tidak tersedia
                                </span>
                            )}
                        </div>

                        {/* File Preview */}
                        {latestKalender.file_url ? ( // Check if file_url exists
                            isPdfUrl(latestKalender.file_url) ? (
                                // PDF Preview
                                <div className="w-full h-[600px] overflow-hidden">
                                    <iframe
                                        src={latestKalender.file_url}
                                        width="50%"
                                        height="90%"
                                        style={{ border: 'none' }}
                                        title={`Pratinjau Kalender ${latestKalender.tahun_ajaran}`}
                                    >
                                        Browser Anda tidak mendukung pratinjau PDF. Silakan unduh file di atas.
                                    </iframe>
                                </div>
                            ) : isImageUrl(latestKalender.file_url) ? (
                                // Image Preview
                                <div className="w-full flex justify-center overflow-hidden p-4"> {/* Removed card styling, kept padding */}
                                    <img
                                        src={latestKalender.file_url}
                                        alt={`Pratinjau Kalender ${latestKalender.tahun_ajaran}`}
                                        className="max-w-3xl h-auto object-contain" // Mengurangi lebar maksimum gambar
                                    />
                                </div>
                            ) : (
                                // Preview not available for other formats
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>Pratinjau tidak tersedia untuk format file ini.</p>
                                    <p className="text-sm mt-1">Silakan gunakan tautan "Unduh / Lihat File" di atas.</p>
                                </div>
                            )
                        ) : (
                            // No file URL available
                            <div className="text-center py-8 text-muted-foreground">
                                <p>Tidak ada file kalender yang terkait dengan entri ini.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
};

export default KalenderAkademikPublicPage;
