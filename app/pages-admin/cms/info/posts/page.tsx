// app/pages-admin/cms/posts/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client'; // Icons
import { Pencil, Trash2, PlusCircle, Search, Newspaper } from 'lucide-react'; // Filter, Clock, Eye removed as they are not used here. Newspaper added.
import Link from 'next/link';
import SidebarAdmin from '@/components/SidebarAdmin'; // Import SidebarAdmin

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
            'published': { color: 'bg-green-200 text-green-800', text: 'Published' },
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
        <div className="min-h-screen theme-admin">
            <SidebarAdmin />
            <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto">
                <div className="max-w-7xl mx-auto"> {/* Container asli dipertahankan di dalam main */}
                    <div className="flex justify-between items-center mb-8"> {/* Ukuran font disesuaikan */}
                        <h1 className="text-2xl font-bold text-foreground flex items-center">
                            <Newspaper className="mr-3 h-6 w-6" /> Manajemen Berita
                        </h1>
                        {/* Pastikan path Link ini benar, jika Anda menggunakan [action]/page.tsx, mungkin perlu /create */}
                        <Link href="/pages-admin/cms/info/posts/create"> 
                            <button className="flex items-center bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md transition duration-200 text-sm font-medium"> {/* Styling disesuaikan */}
                                <PlusCircle className="w-5 h-5 mr-2" />
                                <span>Tambah Berita</span>
                            </button>
                        </Link>
                    </div>

                    {/* Filters and Search */}
                    <div className="bg-card p-4 rounded-lg shadow-md mb-6 border border-border"> {/* Styling disesuaikan */}
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" /> {/* Warna ikon disesuaikan */}
                                <input
                                    type="text"
                                    placeholder="cari berita..."
                                    className="pl-10 pr-3 py-2 w-full border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring focus:outline-none text-sm" // Styling input disesuaikan
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col md:flex-row gap-2">
                                <div className="md:w-48">
                                    <select
                                        value={filterCategory}
                                        onChange={(e) => setFilterCategory(e.target.value)}
                                        className="w-full px-3 py-2 border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring focus:outline-none text-sm" // Styling select disesuaikan
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
                                        className="w-full px-3 py-2 border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring focus:outline-none text-sm" // Styling select disesuaikan
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
                    <div className="bg-card rounded-lg shadow-md overflow-hidden border border-border"> {/* Styling disesuaikan */}
                        {loading ? (
                            <div className="p-8 text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div> {/* Warna spinner disesuaikan */}
                                <p className="mt-4 text-muted-foreground">Loading posts...</p> {/* Warna teks disesuaikan */}
                            </div>
                        ) : filteredPosts.length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="text-muted-foreground">No posts found. Create your first post!</p> {/* Warna teks disesuaikan */}
                            </div>
                        ) : (
                            <div> {/* Menghapus overflow-x-auto */}
                                <table className="min-w-full divide-y divide-border"> 
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Published</th>
                                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                                            <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-card divide-y divide-border"> 
                                        {filteredPosts.map((post) => (
                                            <tr key={post.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-2"> {/* Menghapus whitespace-nowrap */}
                                                    <div className="text-sm font-medium text-foreground truncate max-w-xs">{post.title}</div> 
                                                    <div className="text-xs text-muted-foreground">{post.slug}</div> 
                                                </td>
                                                <td className="px-4 py-2"> {/* Menghapus whitespace-nowrap */}
                                                    <div className="text-sm text-foreground">{getCategoryName(post.category_id)}</div> 
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    {getStatusBadge(post.status)}
                                                </td>
                                                <td className="px-4 py-2"> {/* Menghapus whitespace-nowrap */}
                                                    <div className="text-sm text-muted-foreground">{formatDate(post.published_at)}</div> 
                                                </td>
                                                <td className="px-4 py-2"> {/* Menghapus whitespace-nowrap */}
                                                    <div className="text-sm text-muted-foreground">{formatDate(post.created_at)}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end space-x-2">
                                                        <Link href={`/pages-admin/cms/info/posts/edit/${post.id}`}>
                                                            <button className="text-primary hover:text-primary/80">
                                                                <Pencil className="w-5 h-5" />
                                                            </button>
                                                        </Link>
                                                        <button onClick={() => deletePost(post.id)} className="text-destructive hover:text-destructive/80"> 
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