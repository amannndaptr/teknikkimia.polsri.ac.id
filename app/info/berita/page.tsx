'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, ArrowRight, Calendar, Search, Tag } from 'lucide-react';

// Define TypeScript interfaces
interface BeritaItem {
    id: number;
    title: string;
    slug: string;
    post_image: string;
    status: string;
    published_at: string;
    created_at: string;
    updated_at: string;
    content: string;
    category?: {
        id: number;
        name: string;
        slug: string;
    };
}

interface CategoryItem {
    id: number;
    name: string;
    slug: string;
}

export default function BeritaListing() {
    const [berita, setBerita] = useState<BeritaItem[]>([]);
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    // const [currentPage, setCurrentPage] = useState<number>(1); // Dihapus
    // const [totalPages, setTotalPages] = useState<number>(1); // Dihapus, atau bisa di-set ke 1 jika ada logika lain yg butuh
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [totalBerita, setTotalBerita] = useState<number>(0);
    // const itemsPerPage = 6; // Dihapus
    const supabase = createClient();

    // Map untuk warna kategori, serupa dengan di app/page.tsx
    // Pastikan nama kategori di sini (kunci objek) sesuai dengan nama kategori di database Anda
    const categoryColorMap: Record<string, string> = {
        "Berita": "bg-emerald-500", // Contoh
        "Lowongan Kerja": "bg-blue-500", // Contoh
        "Pengumuman": "bg-amber-500", // Contoh
        "Akademik": "bg-purple-500", // Contoh
    };

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data, error } = await supabase
                    .from('categories')
                    .select('id, name, slug')
                    .order('name', { ascending: true });

                if (error) {
                    console.error("Error fetching categories:", error.message);
                    return;
                }

                if (data) {
                    setCategories(data);
                }
            } catch (err) {
                console.error("Exception fetching categories:", err);
            }
        };

        fetchCategories();
    }, []);

    useEffect(() => {
        const fetchBerita = async () => {
            setIsLoading(true);

            try {
                // Pagination calculation removed
                // const from = (currentPage - 1) * itemsPerPage;
                // const to = from + itemsPerPage - 1;

                // Build the base query
                let query = supabase
                    .from('berita')
                    .select(`
            id,
            title,
            slug,
            post_image,
            status,
            published_at,
            created_at,
            updated_at,
            category_id,
            categories (
              id,
              name,
              slug
            )
          `, { count: 'exact' })
                    .eq('status', 'published')
                    .order('created_at', { ascending: false });

                // Add search filter if provided
                if (searchTerm) {
                    query = query.ilike('title', `%${searchTerm}%`);
                }

                // Add category filter if selected
                if (selectedCategory) {
                    try {
                        const { data: categoryData, error: categoryError } = await supabase
                            .from('categories')
                            .select('id')
                            .eq('slug', selectedCategory)
                            .single();

                        if (categoryError) {
                            console.error("Error fetching category ID:", categoryError.message);
                        } else if (categoryData) {
                            query = query.eq('category_id', categoryData.id);
                        }
                    } catch (err) {
                        console.error("Exception fetching category:", err);
                    }
                }

                // Pagination range removed
                // query = query.range(from, to);

                // Execute the query
                const { data, error, count } = await query;

                if (error) {
                    console.error("Error fetching posts:", error.message);
                    setBerita([]);
                    setTotalBerita(0);
                    // setTotalPages(1); // Dihapus
                    setIsLoading(false);
                    return;
                }

                if (!data) {
                    setBerita([]);
                    setTotalBerita(0);
                    // setTotalPages(1); // Dihapus
                    setIsLoading(false);
                    return;
                }

                // Nama bucket Supabase Storage untuk gambar berita
                const BERITA_IMAGE_BUCKET = 'berita';

                // Process posts data to include content and format categories
                const beritaWithContent = await Promise.all(
                    data.map(async (post) => {
                        try {
                            const { data: sectionData, error: sectionError } = await supabase
                                .from('sections')
                                .select('content')
                                .eq('post_id', post.id)
                                .order('sort_order', { ascending: true })
                                .limit(1);

                            let finalPostImage = "/placeholder.png"; // Default ke placeholder

                            if (post.post_image) {
                                if (post.post_image.startsWith('http://') || post.post_image.startsWith('https://')) {
                                    finalPostImage = post.post_image;
                                } else {
                                    // Asumsikan post.post_image adalah path, buat URL publik
                                    const { data: publicURLData } = supabase.storage
                                        .from(BERITA_IMAGE_BUCKET)
                                        .getPublicUrl(post.post_image);
                                    finalPostImage = publicURLData?.publicUrl || "/placeholder.png";
                                }
                            }

                            if (sectionError) {
                                console.error(`Error fetching content for post ${post.id}:`, sectionError.message);
                                return {
                                    ...post,
                                    category: post.categories && post.categories.length > 0
                                        ? {
                                            id: post.categories[0].id,
                                            name: post.categories[0].name,
                                            slug: post.categories[0].slug
                                        }
                                        : undefined, // Tetap undefined jika tidak ada kategori
                                    post_image: finalPostImage,
                                    content: ''
                                };
                            }

                            return {
                                ...post,
                                category: post.categories && post.categories.length > 0
                                    ? {
                                        id: post.categories[0].id,
                                        name: post.categories[0].name,
                                        slug: post.categories[0].slug
                                    }
                                    : undefined,
                                post_image: finalPostImage,
                                content: sectionData && sectionData.length > 0 ? sectionData[0].content : ''
                            };
                        } catch (err) {
                            console.error(`Exception processing post ${post.id}:`, err);
                            return {
                                ...post,
                                category: post.categories && post.categories.length > 0
                                    ? {
                                        id: post.categories[0].id,
                                        name: post.categories[0].name,
                                        slug: post.categories[0].slug
                                    }
                                    : undefined,
                                post_image: post.post_image || "/placeholder.png", // Fallback jika error saat proses post_image
                                content: ''
                            };
                        }
                    })
                );

                setBerita(beritaWithContent);

                // Update pagination information
                if (count !== null) {
                    setTotalBerita(count);
                    // setTotalPages(Math.ceil(count / itemsPerPage)); // Dihapus
                } else {
                    setTotalBerita(beritaWithContent.length);
                    // setTotalPages(1); // Dihapus
                }
            } catch (err) {
                console.error("Exception in fetching posts:", err);
                setBerita([]);
                setTotalBerita(0);
                // setTotalPages(1); // Dihapus
            } finally {
                setIsLoading(false);
            }
        };

        fetchBerita();
    }, [searchTerm, selectedCategory]); // currentPage dihapus dari dependencies, useEffect closure fixed
    // Format date to Indonesian format
    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
    };

    // Handle search
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // setCurrentPage(1); // Dihapus
    };

    // Handle category filter
    const handleCategoryFilter = (categorySlug: string) => {
        setSelectedCategory(categorySlug === selectedCategory ? '' : categorySlug);
        // setCurrentPage(1); // Dihapus
    };

    // Fungsi untuk mendapatkan kelas warna teks link berdasarkan kategori
    const getLinkTextColorClass = (categoryName?: string): string => {
        if (!categoryName) return "text-blue-600"; // Warna default jika tidak ada kategori atau tidak cocok

        const bgColorClass = categoryColorMap[categoryName] || "bg-gray-500"; // Dapatkan bg color dari map, fallback ke abu-abu
        // Ubah bg-color-500 menjadi text-color-600 (atau variasi lain yang diinginkan)
        const textColor = bgColorClass.replace('bg-', 'text-').replace('-500', '-600');
        return textColor;
    };


    return (
        <main className="w-full pt-8 pb-16 bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center"> {/* mb-2 dihilangkan untuk mengurangi jarak ke elemen di bawahnya */}
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Informasi Terkini</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Dapatkan berita, lowongan kerja, dan pengumuman terbaru seputar Teknik Kimia
                    </p>
                </div>

                {/* Search and Filter */}
                <div className="bg-white shadow-md rounded-lg p-6 mb-2">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        {/* Search Form */}
                        <form onSubmit={handleSearch} className="flex-grow max-w-md">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Cari informasi..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button type="submit" className="absolute right-3 top-2.5 text-gray-500 hover:text-blue-600">
                                    <Search size={18} />
                                </button>
                            </div>
                        </form>

                        {/* Categories */}
                        <div className="flex-grow">
                            <div className="flex flex-wrap gap-2">
                                {categories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => handleCategoryFilter(category.slug)}
                                        className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedCategory === category.slug
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {category.name}
                                    </button>
                                ))}
                                {selectedCategory && (
                                    <button
                                        onClick={() => setSelectedCategory('')}
                                        className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-700 hover:bg-red-200"
                                    >
                                        Reset Filter
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results count */}
                {/* Results count section removed */}

                {/* Posts Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[...Array(6)].map((_, index) => (
                            <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
                                <div className="h-48 bg-gray-200"></div>
                                <div className="p-4">
                                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
                                    <div className="h-8 bg-gray-200 rounded-md w-1/3"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : berita.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-md p-8 text-center">
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Tidak ada informasi ditemukan</h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm || selectedCategory
                                ? "Coba ubah kata kunci pencarian atau reset filter kategori."
                                : "Belum ada informasi yang dipublikasikan."}
                        </p>
                        {(searchTerm || selectedCategory) && (
                            <div className="flex justify-center gap-4 mt-4">
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition"
                                    >
                                        Reset Pencarian
                                    </button>
                                )}
                                {selectedCategory && (
                                    <button
                                        onClick={() => setSelectedCategory('')}
                                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition"
                                    >
                                        Reset Filter Kategori
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {berita.map((post) => (
                            <div key={post.id} className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                                <div className="relative aspect-square overflow-hidden group"> {/* Menggunakan aspect-square untuk rasio 1:1 */}
                                    <img
                                        src={post.post_image || "/placeholder.png"}
                                        alt={post.title}
                                        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.png"; }}
                                        className="w-full h-full object-cover object-center"
                                    />
                                    <div className="absolute inset-0 bg-gradient-from-b from-transparent to-black opacity-0 group-hover:opacity-30 transition-opacity" />
                                </div>
                                <div className="p-4 flex flex-col flex-grow">
                                    <div> {/* Wrapper untuk konten atas */}
                                        <div className="flex items-center space-x-2 mb-2">
                                            <Calendar size={14} className="text-gray-500" />
                                            <span className="text-xs text-gray-500">
                                                {formatDate(post.published_at || post.created_at)}
                                            </span>
                                            {post.category && (
                                                <>
                                                    <span className="text-gray-300">•</span>
                                                    <div className="flex items-center">
                                                        <Tag size={14} className="text-gray-500 mr-1" />
                                                        <span className="text-xs text-gray-500">{post.category.name}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-800 line-clamp-2 mb-2 group-hover:text-red-800 transition-colors">{post.title}</h3>
                                        {/* Deskripsi singkat bisa ditambahkan di sini jika diinginkan */}
                                        {/* <p className="text-sm text-gray-600 line-clamp-3 mb-4">{post.content}</p> */}
                                    </div>
                                    <div className="pt-2 border-t border-gray-100 flex justify-end">
                                        <Link href={`/info/berita/${post.slug}`} className={`text-sm font-medium inline-flex items-center ${getLinkTextColorClass(post.category?.name)} transition-colors`}>
                                            Lihat Detail
                                            <ArrowRight size={14} className="ml-1" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {/* Pagination section removed */}
            </div>
        </main>
    );
}