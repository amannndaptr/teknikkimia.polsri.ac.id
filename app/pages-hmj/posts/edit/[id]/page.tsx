'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client'; // Pastikan path ini benar
import { Save, ArrowLeft, Calendar, Image as ImageIcon, Clock, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import SidebarHMJ from '@/components/SidebarHMJ';

interface Category {
    id: string;
    name: string;
    slug: string;
}

interface Berita {
    id?: string;
    title: string;
    slug: string;
    category_id: string;
    post_image: string | null;
    status: string;
    published_at: string | null;
}

interface Section {
    id?: string;
    post_id?: string;
    content: string;
    sort_order: number;
}

export default function EditPostForm() {
    const params = useParams();
    const router = useRouter();
    const postId = Array.isArray(params.id) ? params.id[0] : params.id;

    const [post, setPost] = useState<Berita>({
        title: '',
        slug: '',
        category_id: '',
        post_image: null,
        status: 'draft',
        published_at: null,
    });

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sections, setSections] = useState<Section[]>([
        { content: '', sort_order: 0 }
    ]);
    const supabase = createClient();

    useEffect(() => {
        fetchCategories();
        if (postId) {
            fetchPost(postId);
            fetchSections(postId);
        }
    }, [postId]);

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

    async function fetchPost(id: string) {
        const { data, error } = await supabase
            .from('berita')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching post:', error);
            alert('Error fetching post');
            router.push('/pages-hmj/posts');
        } else if (data) {
            setPost(data);
        }
        setLoading(false);
    }

    async function fetchSections(postId: string) {
        const { data, error } = await supabase
            .from('sections')
            .select('*')
            .eq('post_id', postId)
            .order('sort_order');

        if (error) {
            console.error('Error fetching sections:', error);
        } else if (data && data.length > 0) {
            setSections(data);
        }
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        try {
            const file = e.target.files?.[0];
            if (!file) {
                console.log('No file selected');
                return;
            }

            console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);

            // Validasi tipe file (hanya gambar)
            if (!file.type.startsWith('image/')) {
                alert('File harus berupa gambar');
                return;
            }

            // Validasi ukuran file (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Ukuran file terlalu besar (max 5MB)');
                return;
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
            const filePath = `${fileName}`;

            console.log('Uploading to path:', filePath);

            // Upload file ke storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('berita') // Pastikan nama bucket ini benar
                .upload(filePath, file);

            if (uploadError) {
                console.error('Upload error:', uploadError);
                alert(`Gagal mengupload gambar: ${uploadError.message || 'Unknown error'}`);
                return;
            }

            console.log('Upload successful:', uploadData);

            // Mendapatkan URL publik
            const { data: publicUrlData } = supabase.storage
                .from('berita') // Pastikan nama bucket ini benar
                .getPublicUrl(filePath);

            console.log('Public URL data:', publicUrlData);

            if (!publicUrlData || !publicUrlData.publicUrl) {
                console.error('Failed to get public URL');
                alert('Gagal mendapatkan URL publik untuk gambar');
                return;
            }
            handlePostChange('post_image', publicUrlData.publicUrl);
            alert('Gambar berhasil diupload');
        } catch (err) {
            console.error('Error in image upload:', err);
            alert(`Error saat mengupload gambar: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        try {
            console.log("Starting post update process...");

            // Validate required fields
            if (!post.title?.trim()) {
                throw new Error("Judul berita tidak boleh kosong");
            }
            if (!post.category_id) {
                throw new Error("Kategori harus dipilih");
            }

            // Generate slug if empty (seharusnya sudah ada saat edit, tapi sebagai fallback)
            if (!post.slug?.trim()) {
                post.slug = post.title
                    .trim()
                    .toLowerCase()
                    .replace(/[^\w\s]/gi, '')
                    .replace(/\s+/g, '-');
            }

            console.log("Updating post with ID:", postId);
            // Update existing post
            const { data: updateData, error: updateError } = await supabase
                .from('berita')
                .update({
                    title: post.title.trim(),
                    slug: post.slug.trim(),
                    category_id: post.category_id,
                    post_image: post.post_image,
                    status: post.status,
                    published_at: post.status === 'published' && !post.published_at ? new Date().toISOString() : post.published_at,
                    updated_at: new Date().toISOString()
                })
                .eq('id', postId)
                .select(); // Menambahkan .select() untuk mendapatkan data yang diupdate jika diperlukan

            if (updateError) {
                console.error("Post update error:", updateError);
                throw new Error(`Gagal memperbarui berita: ${updateError.message || JSON.stringify(updateError)}`);
            }
            console.log("Post updated successfully:", updateData);

            // Delete existing sections
            console.log("Deleting existing sections for post ID:", postId);
            const { error: deleteError } = await supabase
                .from('sections')
                .delete()
                .eq('post_id', postId);

            if (deleteError) {
                console.error("Section deletion error:", deleteError);
                throw new Error(`Gagal menghapus section lama: ${deleteError.message || JSON.stringify(deleteError)}`);
            }
            console.log("Existing sections deleted successfully");

            // Insert new sections
            console.log("Processing sections for post ID:", postId);
            const validSections = sections.filter(section => section.content.trim() !== '');
            const sectionsToInsert = validSections.length > 0 ? validSections : [{ content: '', sort_order: 0 }];

            console.log(`Inserting ${sectionsToInsert.length} sections...`);
            const { error: sectionsError } = await supabase
                .from('sections')
                .insert(
                    sectionsToInsert.map((section, index) => ({ // Menggunakan index untuk sort_order
                        post_id: postId,
                        content: section.content,
                        sort_order: index, // Memastikan urutan yang benar
                        created_at: new Date().toISOString() // Menambahkan created_at untuk section baru
                    }))
                );

            if (sectionsError) throw sectionsError;

            router.push('/pages-hmj/posts');
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : typeof error === 'object' && error !== null
                    ? JSON.stringify(error)
                    : 'Unknown error occurred';

            console.error('Error saving post:', errorMessage, error);
            alert(`Gagal menyimpan perubahan: ${errorMessage}`);
        } finally {
            setSaving(false);
        }
    }

    function handlePostChange(key: keyof Berita, value: any) {
        setPost(prev => ({ ...prev, [key]: value }));
    }

    function handleTitleChange(title: string) {
        handlePostChange('title', title);

        // Auto-generate slug from title if slug is empty (memungkinkan pengguna mengosongkan slug untuk regenerasi)
        if (!post.slug) {
            const generatedSlug = title
                .trim()
                .toLowerCase()
                .replace(/[^\w\s]/gi, '')
                .replace(/\s+/g, '-');
            handlePostChange('slug', generatedSlug);
        }
    }

    function handleSectionChange(index: number, value: string) {
        const updatedSections = [...sections];
        updatedSections[index].content = value;
        setSections(updatedSections);
    }

    function addSection() {
        const newSortOrder = sections.length > 0
            ? Math.max(...sections.map(s => s.sort_order)) + 1
            : 0;

        setSections([...sections, { content: '', sort_order: newSortOrder }]);
    }

    function removeSection(index: number) {
        if (sections.length <= 1) {
            alert('You must have at least one section');
            return;
        }

        const updatedSections = sections.filter((_, i) => i !== index);

        // Update sort_order to ensure it remains sequential
        const reorderedSections = updatedSections.map((section, idx) => ({
            ...section,
            sort_order: idx
        }));

        setSections(reorderedSections);
    }

    function moveSection(index: number, direction: 'up' | 'down') {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === sections.length - 1)
        ) {
            return; // Already at the top/bottom
        }

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        const updatedSections = [...sections];

        // Swap sections
        [updatedSections[index], updatedSections[newIndex]] = [updatedSections[newIndex], updatedSections[index]];

        // Update sort_order to maintain correct order
        const reorderedSections = updatedSections.map((section, idx) => ({
            ...section,
            sort_order: idx
        }));

        setSections(reorderedSections);
    }

    if (loading) {
        return (
            <div className="min-h-screen theme-hmj">
                <SidebarHMJ />
                <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-gray-100 w-[calc(100%-18rem)] min-h-screen overflow-y-auto flex justify-center items-center"> {/* Changed background */}
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-700 mx-auto"></div> {/* Styled spinner */}
                        <p className="ml-3 mt-4 text-gray-600">Memuat data berita...</p> {/* Styled text */}
                    </div>
                </main>
            </div>
        );
    }
    return (
        <div className="min-h-screen theme-hmj">
            <SidebarHMJ />
            <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-gray-100 w-[calc(100%-18rem)] min-h-screen overflow-y-auto"> {/* Changed background */}
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center mb-2">
                        <Link href="/pages-hmj/posts" className="p-2 rounded-md hover:bg-rose-100 transition-colors" title="Kembali ke Manajemen Berita"> {/* Styled link */}
                            <ArrowLeft className="w-5 h-5 text-rose-700" /> {/* Styled icon */}
                        </Link>
                        <h1 className="text-xl font-semibold text-gray-800 ml-2"> {/* Styled header text */}
                            Edit Berita
                        </h1>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Main Content */}
                            <div className="md:col-span-2 space-y-6">
                                <div className="bg-white rounded-lg shadow-md p-6 border border-rose-500"> {/* Styled card */}
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Judul Berita</label> {/* Styled label */}
                                    <input
                                        type="text"
                                        required
                                        value={post.title}
                                        onChange={(e) => handleTitleChange(e.target.value)}
                                        className="w-full px-3 py-2 border border-rose-300 bg-gray-50 text-gray-800 rounded-md focus:outline-none text-sm" // Styled input
                                        placeholder="Masukkan judul berita"
                                    />
                                </div>

                                <div className="bg-white rounded-lg shadow-md p-6 border border-rose-500"> {/* Styled card */}
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-medium text-gray-800">Isi Berita</h3> {/* Styled heading */}
                                        <button
                                            type="button"
                                            onClick={addSection}
                                            className="inline-flex items-center px-3 py-1 border border-rose-600 text-rose-600 rounded-md text-sm hover:bg-rose-50 transition-colors" // Styled button
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Tambah Bagian
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        {sections.map((section, index) => (
                                            <div key={index} className="border border-rose-300 rounded-lg p-4 bg-rose-50/30"> {/* Styled section container */}
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="font-medium text-gray-700">Bagian Berita {index + 1}</h4> {/* Styled heading */}
                                                    <div className="flex space-x-2">
                                                        <button
                                                            type="button"
                                                            disabled={index === 0}
                                                            onClick={() => moveSection(index, 'up')}
                                                            className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30" // Styled button
                                                        >
                                                            ↑
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={index === sections.length - 1}
                                                            onClick={() => moveSection(index, 'down')}
                                                            className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30" // Styled button
                                                        >
                                                            ↓
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSection(index)}
                                                            className="p-1 text-red-500 hover:text-red-700" // Styled button
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <textarea
                                                    value={section.content || ''} // Ensure value is not undefined
                                                    onChange={(e) => handleSectionChange(index, e.target.value)}
                                                    className="w-full px-3 py-2 border border-rose-300 bg-gray-50 text-gray-800 rounded-md focus:outline-none text-sm" // Styled textarea
                                                    rows={8}
                                                    placeholder="Tulis isi bagian berita di sini..."
                                                />
                                                <div className="text-xs text-gray-500/80 mt-2"></div> {/* Styled hint text */}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                <div className="bg-white rounded-lg shadow-md p-4 border border-rose-500"> {/* Styled card */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label> {/* Styled label */}
                                            <select
                                                value={post.status}
                                                onChange={(e) => handlePostChange('status', e.target.value)}
                                                className="w-full px-3 py-2 border border-rose-300 bg-gray-50 text-gray-800 rounded-md focus:outline-none text-sm" // Styled select
                                            >
                                                <option value="draft">Draft</option>
                                                <option value="published">Published</option>
                                                <option value="archived">Archived</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2"> {/* Styled label */}
                                                <div className="flex items-center">
                                                    <Calendar className="w-4 h-4 mr-1 text-gray-500" /> {/* Styled icon */}
                                                    <span>Tanggal Publish</span>
                                                </div>
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={post.published_at ? new Date(post.published_at).toISOString().slice(0, 16) : ''}
                                                onChange={(e) => handlePostChange('published_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                                className="w-full px-3 py-2 border border-rose-300 bg-gray-50 text-gray-800 rounded-md focus:outline-none text-sm" // Styled input
                                                disabled={post.status !== 'published'}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow-md p-4 border border-rose-500"> {/* Styled card */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label> {/* Styled label */}
                                            <select
                                                required
                                                value={post.category_id}
                                                onChange={(e) => handlePostChange('category_id', e.target.value)}
                                                className="w-full px-3 py-2 border border-rose-300 bg-gray-50 text-gray-800 rounded-md focus:outline-none text-sm" // Styled select
                                            >
                                                <option value="">Pilih kategori</option>
                                                {categories.map((category: Category) => (
                                                    <option key={category.id} value={category.id}>
                                                        {category.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">URL Slug</label> {/* Styled label */}
                                            <input
                                                type="text"
                                                required
                                                value={post.slug}
                                                onChange={(e) => handlePostChange('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                                className="w-full px-3 py-2 border border-rose-300 bg-gray-50 text-gray-800 rounded-md focus:outline-none text-sm" // Styled input
                                                placeholder="slug-url-berita"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2"> {/* Styled label */}
                                                <div className="flex items-center">
                                                    <ImageIcon className="w-4 h-4 mr-1 text-gray-500" /> {/* Styled icon */}
                                                    <span>Gambar Unggulan</span>
                                                </div>
                                            </label>

                                            <div className="text-xs text-gray-500/80 mb-2 break-all"> {/* Styled text and added break-all */}
                                                URL Gambar: {post.post_image ? post.post_image : 'tidak ada'}
                                            </div>

                                            {post.post_image && (
                                                <img
                                                    src={post.post_image}
                                                    alt="Gambar Unggulan"
                                                    className="mb-2 rounded-lg max-h-40 w-full object-cover border border-rose-300 bg-gray-100" // Styled image and added w-full
                                                    onError={(e) => {
                                                        console.error('Error loading image', e);
                                                        // Ganti dengan placeholder jika gambar gagal dimuat
                                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Error+Memuat+Gambar';
                                                    }}
                                                />
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-rose-100 file:text-rose-700 hover:file:bg-rose-200" // Styled file input
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end mt-6">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex items-center bg-rose-700 text-white hover:bg-rose-800 px-6 py-2 rounded-md shadow hover:shadow-md transition-all duration-200 disabled:bg-rose-400 text-sm font-medium" // Styled button
                                    >
                                        {saving ? (
                                            <>
                                                <Clock className="animate-spin w-5 h-5 mr-2" />
                                                <span>Menyimpan...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Simpan Perubahan</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}