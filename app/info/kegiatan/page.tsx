'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ChevronRight, ChevronLeft, Calendar, Search, Image as ImageIcon } from 'lucide-react';

// Define TypeScript interface for Kegiatan
interface KegiatanItem {
    id: string; // Assuming ID is string (UUID)
    image_urls: string[] | null; // Changed to array of strings or null
    description: string | null;
    created_at: string;
    // Add other relevant fields if any, e.g., title, location, date_event
}

export default function KegiatanListingPage() {
    const [kegiatanList, setKegiatanList] = useState<KegiatanItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [totalKegiatan, setTotalKegiatan] = useState<number>(0);
    const [activeImageIndexes, setActiveImageIndexes] = useState<Record<string, number>>({}); // To store active image index for each item
    const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({}); // State to track expanded descriptions
    const itemsPerPage = 6; // Number of activities per page, adjusted to match berita
    const supabase = createClient();

    useEffect(() => {
        const fetchKegiatan = async () => {
            setIsLoading(true);

            try {
                const from = (currentPage - 1) * itemsPerPage;
                const to = from + itemsPerPage - 1;

                let query = supabase
                    .from('kegiatan') // Make sure 'kegiatan' is your table name
                    .select('*', { count: 'exact' })
                    .order('created_at', { ascending: false });

                if (searchTerm) {
                    query = query.ilike('description', `%${searchTerm}%`); // Search in description
                }

                query = query.range(from, to);

                const { data, error, count } = await query;

                if (error) {
                    console.error("Error fetching kegiatan:", error.message);
                    setKegiatanList([]);
                    setTotalKegiatan(0);
                    setTotalPages(1);
                } else if (data) {
                    console.log("Data kegiatan dari Supabase:", data); // Tambahkan ini untuk debugging

                    // Nama bucket Supabase Storage untuk gambar kegiatan
                    const KEGIATAN_IMAGE_BUCKET = 'kegiatan-images';
                    const PLACEHOLDER_IMAGE_URL = "/placeholder.png";

                    const processedDataPromises = data.map(async (item) => {
                        let finalImageUrls: string[] = [];
                        // Pastikan item.image_urls adalah array, bahkan jika awalnya null atau string tunggal
                        const rawImageUrls = Array.isArray(item.image_urls)
                            ? item.image_urls
                            : (item.image_urls ? [item.image_urls as string] : []);

                        if (rawImageUrls.length > 0) {
                            for (const url of rawImageUrls) {
                                if (typeof url === 'string' && url.trim() !== '') {
                                    if (url.startsWith('http://') || url.startsWith('https://')) {
                                        finalImageUrls.push(url);
                                    } else {
                                        // Asumsikan url adalah path, buat URL publik
                                        const { data: publicURLData } = supabase.storage
                                            .from(KEGIATAN_IMAGE_BUCKET)
                                            .getPublicUrl(url);
                                        finalImageUrls.push(publicURLData?.publicUrl || PLACEHOLDER_IMAGE_URL);
                                    }
                                } else {
                                    // Jika elemen dalam array bukan string yang valid atau kosong, gunakan placeholder
                                    finalImageUrls.push(PLACEHOLDER_IMAGE_URL);
                                }
                            }
                        }

                        return {
                            ...item,
                            image_urls: finalImageUrls.length > 0 ? finalImageUrls : null, // Atau [], jika Anda lebih suka array kosong daripada null
                        };
                    });

                    const processedData = await Promise.all(processedDataPromises);
                    setKegiatanList(processedData as KegiatanItem[]);

                    if (count !== null) {
                        setTotalKegiatan(count);
                        setTotalPages(Math.ceil(count / itemsPerPage));
                    } else {
                        setTotalKegiatan(data.length); // Fallback if count is null
                        setTotalPages(1);
                    }
                }
            } catch (err) {
                console.error("Exception in fetching kegiatan:", err);
                setKegiatanList([]);
                setTotalKegiatan(0);
                setTotalPages(1);
            } finally {
                setIsLoading(false);
            }
        };

        fetchKegiatan();
    }, [currentPage, searchTerm, supabase]); // Added supabase to dependency array

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
    };

    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;
        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }
            if (startPage > 1) {
                pages.push(1);
                if (startPage > 2) pages.push(-1); // Ellipsis
            }
            for (let i = startPage; i <= endPage; i++) pages.push(i);
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) pages.push(-2); // Ellipsis
                pages.push(totalPages);
            }
        }
        return pages;
    };

    const handleImageSlide = (itemId: string, direction: 'next' | 'prev') => {
        const item = kegiatanList.find(k => k.id === itemId);
        if (!item || !item.image_urls || item.image_urls.length <= 1) return;

        setActiveImageIndexes(prevIndexes => {
            const currentIndex = prevIndexes[itemId] || 0;
            let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

            if (newIndex < 0) newIndex = item.image_urls!.length - 1;
            if (newIndex >= item.image_urls!.length) newIndex = 0;

            return { ...prevIndexes, [itemId]: newIndex };
        });
    };

    const handleToggleDescription = (itemId: string) => {
        setExpandedDescriptions(prev => ({
            ...prev,
            [itemId]: !prev[itemId] // Toggle the boolean value for the specific item
        }));
    };


    return (
        <main className="w-full pt-8 pb-16 bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4">
                <div className="text-center mb-2">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Galeri Kegiatan Jurusan</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Lihat dokumentasi berbagai kegiatan yang telah dilaksanakan oleh Jurusan Teknik Kimia.
                    </p>
                </div>

                <div className="shadow-md rounded-lg p-6 mb-2"> {/* bg-white dihapus */}
                    <form onSubmit={handleSearch} className="max-w-md">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari kegiatan..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button type="submit" className="absolute right-3 top-2.5 text-gray-500 hover:text-blue-600">
                                <Search size={18} />
                            </button>
                        </div>
                    </form>
                </div>

                {/* Results count section removed */}

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[...Array(itemsPerPage)].map((_, index) => (
                            <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse"> {/* Gap will be handled by parent */}
                                <div className="h-56 bg-gray-200"></div>
                                <div className="p-4"><div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div><div className="h-4 bg-gray-200 rounded w-1/2"></div></div>
                            </div>
                        ))}
                    </div>
                ) : kegiatanList.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-md p-8 text-center"><ImageIcon size={48} className="mx-auto text-gray-400 mb-4" /><h3 className="text-xl font-semibold text-gray-800 mb-2">Tidak ada kegiatan ditemukan</h3><p className="text-gray-600">{searchTerm ? "Coba ubah kata kunci pencarian Anda." : "Belum ada kegiatan yang dipublikasikan."}</p>{searchTerm && <button onClick={() => {setSearchTerm(''); setCurrentPage(1);}} className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition">Reset Pencarian</button>}</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"> {/* Menyesuaikan grid dan gap seperti berita */}
                        {kegiatanList.map((item) => (
                            <div key={item.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow group flex flex-col">
                                {/* Image container with slideshow controls */}
                                <div className="relative aspect-square overflow-hidden rounded-t-xl"> {/* Mengubah rasio aspek gambar menjadi 1:1 */}
                                    {/* Link component removed from here */}
                                        <img
                                            src={(item.image_urls && item.image_urls.length > 0 ? item.image_urls[activeImageIndexes[item.id] || 0] : "/placeholder.png")} 
                                            alt={item.description || "Gambar Kegiatan"} 
                                            className="w-full h-full object-cover transition-transform duration-300"
                                            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.png"; }}
                                        />

                                    {item.image_urls && item.image_urls.length > 1 && (
                                        <>
                                            <button 
                                                onClick={() => handleImageSlide(item.id, 'prev')}
                                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 rounded-full z-10 transition-colors"
                                                aria-label="Gambar Sebelumnya"
                                            >
                                                <ChevronLeft size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleImageSlide(item.id, 'next')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 rounded-full z-10 transition-colors"
                                                aria-label="Gambar Berikutnya"
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10">
                                                {item.image_urls.map((_, idx) => (
                                                    <div key={idx} className={`w-2 h-2 rounded-full ${ (activeImageIndexes[item.id] || 0) === idx ? 'bg-white' : 'bg-white/50'}`}></div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                    </div>
                                <div className="p-4 flex flex-col flex-grow">
                                    <p 
                                        className={`text-base text-gray-700 mb-2 flex-grow font-medium cursor-pointer transition-all duration-300 ease-in-out ${!expandedDescriptions[item.id] ? 'line-clamp-3 min-h-[60px]' : 'min-h-[60px]'}`}
                                        onClick={() => handleToggleDescription(item.id)}
                                        title={expandedDescriptions[item.id] ? "Klik untuk menyembunyikan" : "Klik untuk melihat selengkapnya"}
                                    >
                                        {item.description || <span className="italic text-gray-400 font-normal">Tidak ada deskripsi</span>}
                                    </p>
                                    <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-100"> {/* Adjusted pt for consistency */}
                                        <div className="flex items-center text-sm text-gray-500 font-medium"><Calendar size={14} className="mr-1.5" /><span>{formatDate(item.created_at)}</span></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!isLoading && totalPages > 1 && (
                    <div className="flex justify-center mt-12">
                        <nav className="flex items-center space-x-1">
                            <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className={`p-2 rounded-md ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-200'}`}><ChevronLeft size={16} /></button>
                            {getPageNumbers().map((pageNum, index) => pageNum < 0 ? <span key={`ellipsis-${index}`} className="px-2">...</span> : <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`w-9 h-9 flex items-center justify-center rounded-md ${currentPage === pageNum ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>{pageNum}</button>)}
                            <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className={`p-2 rounded-md ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-200'}`}><ChevronRight size={16} /></button>
                        </nav>
                    </div>
                )}
            </div>
        </main>
    );
}