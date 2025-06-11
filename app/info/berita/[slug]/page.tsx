'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Calendar, Clock, Tag, TrendingUp, List } from 'lucide-react';

// Define TypeScript interfaces
interface BeritaDetail {
    id: number;
    title: string;
    slug: string;
    post_image: string;
    status: string;
    published_at: string;
    created_at: string;
    updated_at: string;
    content: string;
    category_id?: number;
    category?: {
        id: number;
        name: string;
        slug: string;
    };
}

interface RelatedNews {
    id: number;
    title: string;
    slug: string;
    post_image: string;
    published_at: string;
    created_at: string;
    category?: {
        name: string;
        slug: string;
    };
}

export default function PostDetail() {
    const { slug } = useParams();
    const [post, setPost] = useState<BeritaDetail | null>(null);
    const [relatedNews, setRelatedNews] = useState<RelatedNews[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const fetchPostDetail = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Fetch the post by slug with its section content and category
                const { data: postData, error: postError } = await supabase
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
          `)
                    .eq('slug', slug)
                    .eq('status', 'published')
                    .single();

                if (postError) {
                    console.error("Error fetching post:", postError);
                    setError("Tidak dapat menemukan informasi yang diminta");
                    return;
                }

                // Fetch the post content from sections table
                const { data: sectionData, error: sectionError } = await supabase
                    .from('sections')
                    .select('content')
                    .eq('post_id', postData.id)
                    .order('sort_order', { ascending: true });

                if (sectionError) {
                    console.error("Error fetching sections:", sectionError);
                    setError("Gagal memuat konten artikel");
                    return;
                }

                // Nama bucket Supabase Storage untuk gambar berita
                const BERITA_IMAGE_BUCKET = 'berita';
                let finalPostImage = "/placeholder.png"; // Default ke placeholder

                if (postData.post_image) {
                    if (postData.post_image.startsWith('http://') || postData.post_image.startsWith('https://')) {
                        finalPostImage = postData.post_image;
                    } else {
                        // Asumsikan postData.post_image adalah path, buat URL publik
                        const { data: publicURLData } = supabase.storage
                            .from(BERITA_IMAGE_BUCKET)
                            .getPublicUrl(postData.post_image);
                        finalPostImage = publicURLData?.publicUrl || "/placeholder.png";
                    }
                }

                // Combine the post data with its content
                const postWithContent: BeritaDetail = {
                    ...postData,
                    post_image: finalPostImage,
                    category: postData.categories && postData.categories.length > 0
                        ? {
                            id: postData.categories[0].id,
                            name: postData.categories[0].name,
                            slug: postData.categories[0].slug
                        }
                        : undefined,
                    content: sectionData && sectionData.length > 0
                        ? sectionData.map(section => section.content).join('\n\n')
                        : '',
                };

                setPost(postWithContent);

                // Fetch related news (same category or latest news)
                await fetchRelatedNews(postData.id, postData.category_id);

            } catch (err) {
                console.error("Unexpected error:", err);
                setError("Terjadi kesalahan saat memuat informasi");
            } finally {
                setIsLoading(false);
            }
        };

        const fetchRelatedNews = async (currentPostId: number, categoryId?: number) => {
            try {
                let query = supabase
                    .from('berita')
                    .select(`
                        id,
                        title,
                        slug,
                        post_image,
                        published_at,
                        created_at,
                        categories (
                            name,
                            slug
                        )
                    `)
                    .eq('status', 'published')
                    .neq('id', currentPostId)
                    .order('published_at', { ascending: false })
                    .limit(6);

                // If the current post has a category, prioritize posts from the same category
                if (categoryId) {
                    query = query.eq('category_id', categoryId);
                }

                const { data: relatedData, error: relatedError } = await query;

                if (relatedError) {
                    console.error("Error fetching related news:", relatedError);
                    return;
                }

                // If we don't have enough related news from the same category, fetch latest news
                if (!relatedData || relatedData.length < 3) {
                    const { data: latestData, error: latestError } = await supabase
                        .from('berita')
                        .select(`
                            id,
                            title,
                            slug,
                            post_image,
                            published_at,
                            created_at,
                            categories (
                                name,
                                slug
                            )
                        `)
                        .eq('status', 'published')
                        .neq('id', currentPostId)
                        .order('published_at', { ascending: false })
                        .limit(5);

                    if (!latestError && latestData) {
                        setRelatedNews(latestData.map(item => ({
                            ...item,
                            category: item.categories && item.categories.length > 0 ? item.categories[0] : undefined
                        })));
                    }
                } else {
                    setRelatedNews(relatedData.map(item => ({
                        ...item,
                        category: item.categories && item.categories.length > 0 ? item.categories[0] : undefined
                    })));
                }
            } catch (err) {
                console.error("Error fetching related news:", err);
            }
        };

        if (slug) {
            fetchPostDetail();
        }
    }, [slug]);

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

    // Format date for sidebar (shorter format)
    const formatDateShort = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(date);
    };

    // Process image URL for related news
    const processImageUrl = (imageUrl: string) => {
        if (!imageUrl) return "/placeholder.png";
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return imageUrl;
        }
        const { data: publicURLData } = supabase.storage
            .from('berita')
            .getPublicUrl(imageUrl);
        return publicURLData?.publicUrl || "/placeholder.png";
    };

    // Calculate reading time (rough estimate)
    const calculateReadingTime = (content: string) => {
        const wordsPerMinute = 200;
        const words = content.trim().split(/\s+/).length;
        const readingTime = Math.ceil(words / wordsPerMinute);
        return readingTime > 0 ? readingTime : 1;
    };

    return (
        <div role="main" className="bg-gradient-to-b from-gray-50 to-gray-200 min-h-screen py-8 px-10 md:px-12">
            {isLoading ? (
                <div className="max-w-8xl mx-auto space-y-8">
                    <div className="animate-pulse space-y-8 w-full max-w-6xl">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <div className="h-10 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-80 bg-gray-200 rounded w-full"></div>
                                <div className="space-y-4">
                                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="flex space-x-3">
                                        <div className="h-16 w-16 bg-gray-200 rounded"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                                            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : error ? (
                <div className="container mx-auto px-1 flex flex-col items-center justify-center min-h-[50vh]"> {/* px-2 diubah menjadi px-1 */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-xl">
                        <h2 className="text-2xl font-bold text-red-700 mb-4">Informasi Tidak Ditemukan</h2>
                        <p className="text-red-600 mb-6">{error}</p>
                    </div>
                </div>
            ) : post ? (
                <div className="container mx-auto px-1"> {/* px-2 diubah menjadi px-1 */}
                    <div className="max-w-7xl mx-auto space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Main Content */}
                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    {/* Title */}
                                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">{post.title}</h1>

                                    {/* Meta information */}
                                    <div className="flex flex-wrap items-center text-gray-500 text-sm mb-6 gap-4">
                                        <div className="flex items-center">
                                            <Calendar size={14} className="mr-1" />
                                            <span>{formatDate(post.published_at || post.created_at)}</span>
                                        </div>

                                        {post.category && (
                                            <div className="flex items-center">
                                                <Tag size={14} className="mr-1" />
                                                <Link href={`/category/${post.category.slug}`} className="hover:text-blue-600">
                                                    {post.category.name}
                                                </Link>
                                            </div>
                                        )}

                                        {/* <div className="flex items-center">
                                            <Clock size={14} className="mr-1" />
                                            <span>{calculateReadingTime(post.content)} menit baca</span>
                                        </div> */}
                                    </div>

                                    {/* Post Image */}
                                    <div className="w-full mb-4"> {/* Mengurangi margin-bottom dari mb-6 menjadi mb-4 */}
                                        <div className="relative w-full h-[14rem] md:h-[18rem] lg:h-[24rem] bg-gray-200 rounded-lg overflow-hidden"> {/* Mengembalikan ukuran tinggi spesifik */}
                                            <img
                                                src={post.post_image || "/placeholder.png"}
                                                alt={post.title}
                                                className="w-full h-full object-"
                                            />
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <hr className="border-gray-200 mb-6" />

                                    {/* Content */}
                                    <div className="text-gray-700 text-base md:text-lg leading-relaxed max-w-none">
                                        {post.content.split('\n').map((paragraph, index) => (
                                            <p key={index} className="mb-5 last:mb-0">{paragraph}</p>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar - Related News */}
                            <div className="lg:col-span-1">
                                <div className="sticky top-6 lg:mt-0 mt-8"> {/* Mengubah lg:ml-8 menjadi lg:ml-12 */}
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                        <div className="flex items-center mb-5 justify-center"> {/* Menghilangkan judul, ikon bisa ditengah atau dihilangkan juga jika perlu */}
                                            {/* <List size={22} className="text-blue-600 mr-2" /> */}
                                            {/* <h2 className="text-xl font-semibold text-gray-800">Berita Terkini</h2> */}
                                        </div>

                                        <div className="space-y-4">
                                            {relatedNews.map((news, index) => (
                                                <Link
                                                    key={news.id}
                                                    href={`/info/berita/${news.slug}`} 
                                                    className="block group hover:bg-gray-50 p-3 rounded-lg transition-colors duration-150 -m-3" /* duration-200 to 150 */
                                                >
                                                    <div className="flex items-start space-x-3"> {/* items-start for better alignment if title wraps */}
                                                        <div className="flex-shrink-0">
                                                            {/* Adjusted image size for a slightly larger preview */}
                                                            <div className="w-32 h-16 bg-gray-100 rounded-md overflow-hidden">
                                                                <img
                                                                    src={processImageUrl(news.post_image)}
                                                                    alt={news.title}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            {/* h4 to h3, font-medium to font-semibold for more emphasis */}
                                                            <h3 className="text-base font-semibold text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors duration-150"> {/* Mengubah text-sm menjadi text-base */}
                                                                {news.title}
                                                            </h3>
                                                            <div className="mt-1 flex items-center text-xs text-gray-500">
                                                                {news.category && (
                                                                    <>
                                                                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full text-xs font-medium mr-2">
                                                                            {news.category.name}
                                                                        </span>
                                                                    </>
                                                                )}
                                                                <span className="whitespace-nowrap">{formatDateShort(news.published_at || news.created_at)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                        {relatedNews.length === 0 && (
                                            <div className="text-center py-6"> {/* Adjusted padding */}
                                                <p className="text-gray-500 text-sm">Tidak ada berita terkait ditemukan.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="container mx-auto px-1 text-center py-20"> {/* px-2 diubah menjadi px-1 */}
                    <h2 className="text-2xl font-bold">Informasi tidak ditemukan</h2>
                    <p className="mt-4 mb-6">Artikel yang Anda cari tidak tersedia atau telah dihapus.</p>
                </div>
            )}
        </div>
    );
}