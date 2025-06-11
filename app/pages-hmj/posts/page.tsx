// app/pages-hmj/posts/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Pencil, Trash2, PlusCircle, Search, Newspaper } from 'lucide-react'; // Filter, Clock, Eye removed as they are not used here. Newspaper added.
import Link from 'next/link';
import SidebarHMJ from '@/components/SidebarHMJ';

interface Post {
    id: string;
    title: string;
    slug: string;
    status: string;
    category_id: string;
    thumbnail: string | null;
    published_at: string | null;
    created_at: string;
    updated_at: string | null;
}

interface Category {
    id: string;
    name: string;
    slug: string;
}

export default function PostsManagement() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const supabase = createClient();

    useEffect(() => {
        fetchPosts();
        fetchCategories();
    }, []);

    async function fetchPosts() {
        setLoading(true);
        const { data, error } = await supabase
            .from('berita')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching posts:', error);
        } else {
            setPosts(data || []);
        }
        setLoading(false);
    }

    async function fetchCategories() {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching categories:', error);
        } else {
            setCategories(data || []);
        }
    }

    async function deletePost(id: string) {
        if (confirm('Are you sure you want to delete this post?')) {
            const { error } = await supabase
                .from('berita')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting post:', error);
                alert('Failed to delete post');
            } else {
                fetchPosts(); // Refresh the posts list
            }
        }
    }

    function formatDate(dateString: string | null) {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getCategoryName(categoryId: string) {
        const category = categories.find(cat => cat.id === categoryId);
        return category ? category.name : 'Unknown';
    }

    function getStatusBadge(status: string) {
        const statusMap: Record<string, { color: string, text: string }> = {
            'draft': { color: 'bg-gray-200 text-gray-800', text: 'Draft' },
            'published': { color: 'bg-yellow-200 text-yellow-800', text: 'Published' },
            'archived': { color: 'bg-amber-200 text-amber-800', text: 'Archived' }
        };

        const statusInfo = statusMap[status] || { color: 'bg-gray-200 text-gray-800', text: status };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.text}
            </span>
        );
    }

    // Filter posts based on search term, category, and status
    const filteredPosts = posts.filter(post => {
        const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            post.slug.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory ? post.category_id === filterCategory : true;
        const matchesStatus = filterStatus ? post.status === filterStatus : true;

        return matchesSearch && matchesCategory && matchesStatus;
    });

    return (
        <div className="min-h-screen theme-hmj"> {/* Changed theme */}
            <SidebarHMJ />
            <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-gray-100 w-[calc(100%-18rem)] min-h-screen overflow-y-auto"> {/* Changed background */}
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center"> {/* Changed text color */}
                            <Newspaper className="w-7 h-7 mr-3 text-rose-700" /> {/* Styled icon */}
                            Manajemen Berita
                        </h1>
                        <Link href="/pages-hmj/posts/create"> 
                            <button className="flex items-center bg-rose-700 text-white hover:bg-rose-800 px-4 py-2 rounded-md shadow hover:shadow-md transition-all duration-200 text-sm font-medium"> {/* Styled button */}
                                <PlusCircle className="w-5 h-5 mr-2" />
                                <span>Tambah Berita</span>
                            </button>
                        </Link>
                    </div>

                    {/* Filters and Search */}
                    <div className="bg-white p-4 rounded-lg shadow-md mb-6 border border-rose-500"> {/* Styled card */}
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" /> {/* Styled icon */}
                                <input
                                    type="text"
                                    placeholder="cari berita..."
                                    className="pl-10 pr-3 py-2 w-full border border-rose-300 bg-gray-50 text-gray-800 rounded-md focus:outline-none text-sm" // Styled input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col md:flex-row gap-2">
                                <div className="md:w-48">
                                    <select
                                        value={filterCategory}
                                        onChange={(e) => setFilterCategory(e.target.value)}
                                        className="w-full px-3 py-2 border border-rose-300 bg-gray-50 text-gray-800 rounded-md focus:outline-none text-sm" // Styled select
                                    >
                                        <option value="">Semua Kategori</option>
                                        {categories.map(category => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:w-48">
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="w-full px-3 py-2 border border-rose-300 bg-gray-50 text-gray-800 rounded-md focus:outline-none text-sm" // Styled select
                                    >
                                        <option value="">Semua Status</option>
                                        <option value="draft">Draft</option>
                                        <option value="published">Published</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Posts Table */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-rose-500"> {/* Styled card */}
                        {loading ? (
                            <div className="p-8 text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-700 mx-auto"></div> {/* Styled spinner */}
                                <p className="mt-4 text-gray-600">Memuat data berita...</p> {/* Styled text */}
                            </div>
                        ) : filteredPosts.length === 0 ? (
                            <div className="p-8 text-center bg-white rounded-lg shadow-md border border-rose-500"> {/* Styled empty state container */}
                                <Newspaper className="w-16 h-16 mx-auto text-gray-400 mb-4" /> {/* Added icon */}
                                <p className="text-gray-600">{searchTerm || filterCategory || filterStatus ? "Tidak ada berita yang cocok dengan filter Anda." : "Belum ada berita yang ditambahkan."}</p> {/* Styled text */}
                                {!(searchTerm || filterCategory || filterStatus) && <p className="text-sm text-gray-500 mt-1">Klik "Tambah Berita" untuk memulai.</p>}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-rose-200"> {/* Styled table */}
                                    <thead className="bg-rose-50"> {/* Styled thead */}
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-rose-800 uppercase tracking-wider">Judul</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-rose-800 uppercase tracking-wider">Kategori</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-rose-800 uppercase tracking-wider">Status</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-rose-800 uppercase tracking-wider">Dipublish</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-rose-800 uppercase tracking-wider">Dibuat</th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-rose-800 uppercase tracking-wider">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-rose-200"> {/* Styled tbody */}
                                        {filteredPosts.map((post) => (
                                            <tr key={post.id} className="hover:bg-rose-50/50 transition-colors"> {/* Styled tr hover */}
                                                <td className="px-6 py-4 whitespace-nowrap max-w-xs"> {/* Constrain cell width for title/slug */}
                                                    <div className="text-sm font-medium text-gray-800 truncate">{post.title}</div> {/* Title will truncate within the cell's max-width */}
                                                    <div className="text-xs text-gray-500 truncate">{post.slug}</div> {/* Slug will also truncate */}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap max-w-[200px]"> {/* Constrain cell width for category */}
                                                    <div className="text-sm text-gray-800 truncate">{getCategoryName(post.category_id)}</div> {/* Category name will truncate */}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(post.status)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-600">{formatDate(post.published_at)}</div> {/* Styled text */}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-600">{formatDate(post.created_at)}</div> {/* Styled text */}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end space-x-2">
                                                        <Link href={`/pages-hmj/posts/edit/${post.id}`} className="text-rose-600 hover:text-rose-700" title="Edit"> {/* Styled link */}
                                                            <Pencil className="w-5 h-5" />
                                                        </Link>
                                                        <button onClick={() => deletePost(post.id)} className="text-destructive hover:text-destructive/80" title="Hapus"> {/* Styled button */}
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}