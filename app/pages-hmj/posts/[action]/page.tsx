// app/pages-admin/cms/posts/[action]/page.tsx
// This will handle both create and edit actions
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
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

export default function PostForm() {
    const params = useParams();
    const router = useRouter();
    const isEditing = params.action === 'edit';
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
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [sections, setSections] = useState<Section[]>([
        { content: '', sort_order: 0 }
    ]);
    const supabase = createClient();

    useEffect(() => {
        fetchCategories();
        if (isEditing && postId) {
            fetchPost(postId);
            fetchSections(postId);
        }
    }, [isEditing, postId]);

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
        setLoading(true);
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
                .from('berita')
                .upload(filePath, file);

            if (uploadError) {
                console.error('Upload error:', uploadError);
                alert(`Gagal mengupload post_image: ${uploadError.message || 'Unknown error'}`);
                return;
            }

            console.log('Upload successful:', uploadData);

            // Mendapatkan URL publik
            const { data: publicUrlData } = supabase.storage
                .from('berita')
                .getPublicUrl(filePath);

            console.log('Public URL data:', publicUrlData);

            if (!publicUrlData || !publicUrlData.publicUrl) {
                console.error('Failed to get public URL');
                alert('Gagal mendapatkan URL publik untuk post_image');
                return;
            }

            console.log('Setting post_image URL:', publicUrlData.publicUrl);

            // Set URL ke state
            handlePostChange('post_image', publicUrlData.publicUrl);

            // Konfirmasi ke user
            alert('post_image berhasil diupload');
        } catch (err) {
            console.error('Error in post_image upload:', err);
            alert(`Error saat mengupload post_image: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        try {
            console.log("Starting post save process...");

            // Validate required fields
            if (!post.title?.trim()) {
                throw new Error("Post title is required");
            }

            if (!post.category_id) {
                throw new Error("Category is required");
            }

            // Generate slug if empty
            if (!post.slug) {
                post.slug = post.title
                    .toLowerCase()
                    .replace(/[^\w\s]/gi, '')
                    .replace(/\s+/g, '-');
            }

            let postId = post.id;
            console.log("Processing post with ID:", postId || "new post");

            // Create or update post
            if (isEditing && postId) {
                // Update existing post
                console.log("Updating existing post...");
                const { data: updateData, error: updateError } = await supabase
                    .from('berita')
                    .update({
                        title: post.title.trim(),
                        slug: post.slug,
                        category_id: post.category_id,
                        post_image: post.post_image,
                        status: post.status,
                        published_at: post.status === 'published' && !post.published_at ? new Date().toISOString() : post.published_at,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', postId)
                    .select();

                if (updateError) {
                    console.error("Post update error:", updateError);
                    throw new Error(`Failed to update post: ${updateError.message || JSON.stringify(updateError)}`);
                }

                console.log("Post updated successfully:", updateData);

                // Delete existing sections
                console.log("Deleting existing sections...");
                const { error: deleteError } = await supabase
                    .from('sections')
                    .delete()
                    .eq('post_id', postId);

                if (deleteError) {
                    console.error("Section deletion error:", deleteError);
                    throw new Error(`Failed to delete existing sections: ${deleteError.message || JSON.stringify(deleteError)}`);
                }

                console.log("Existing sections deleted successfully");
            } else {
                // Create new post
                console.log("Creating new post...");
                const { data: newPost, error: insertError } = await supabase
                    .from('berita')
                    .insert({
                        title: post.title.trim(),
                        slug: post.slug,
                        category_id: post.category_id,
                        post_image: post.post_image,
                        status: post.status,
                        published_at: post.status === 'published' ? new Date().toISOString() : null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (insertError) {
                    console.error("Post creation error:", insertError);
                    throw new Error(`Failed to create new post: ${insertError.message || JSON.stringify(insertError)}`);
                }

                if (!newPost || !newPost.id) {
                    throw new Error("No post ID returned after creation");
                }

                postId = newPost.id;
                console.log("New post created with ID:", postId);
            }

            // Insert sections
            if (postId) {
                // Filter out completely empty sections
                console.log("Processing sections for post ID:", postId);
                const validSections = sections.filter(section => section.content.trim() !== '');

                // Always have at least one section, even if empty
                const sectionsToInsert = validSections.length > 0 ? validSections : [{ content: '', sort_order: 0 }];

                // Prepare sections data with proper post_id and sequential sort_order
                const preparedSections = sectionsToInsert.map((section, index) => ({
                    post_id: postId,
                    content: section.content,
                    sort_order: index,
                    created_at: new Date().toISOString()
                }));

                console.log(`Inserting ${preparedSections.length} sections...`);

                // Insert all sections
                const { data: insertedSections, error: sectionsError } = await supabase
                    .from('sections')
                    .insert(preparedSections)
                    .select();

                if (sectionsError) {
                    console.error("Section insertion error:", sectionsError);
                    throw new Error(`Failed to save sections: ${sectionsError.message || JSON.stringify(sectionsError)}`);
                }

                console.log("Sections saved successfully:", insertedSections);
            }

            console.log("Post save process completed successfully");
            router.push('/pages-hmj/posts');
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : typeof error === 'object' && error !== null
                    ? JSON.stringify(error)
                    : 'Unknown error occurred';

            console.error('Error saving post:', errorMessage, error);
            alert(`Failed to save post: ${errorMessage}`);
        } finally {
            setSaving(false);
        }
    }

    function handlePostChange(key: keyof Berita, value: any) {
        setPost(prev => ({ ...prev, [key]: value }));
    }

    function handleTitleChange(title: string) {
        handlePostChange('title', title);

        // Auto-generate slug from title if slug is empty or user hasn't manually changed it
        if (!isEditing || !post.slug) {
            const generatedSlug = title
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
            <div className="min-h-screen theme-hmj"> {/* Diubah ke theme-hmj */}
                <SidebarHMJ />
                <main className="ml-72 px-4 py-3 md:px-6 md:py-4 bg-gray-100 w-[calc(100%-18rem)] min-h-screen overflow-y-auto flex justify-center items-center"> {/* Latar dan padding disesuaikan */}
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-700 mx-auto"></div> {/* Spinner disesuaikan */}
                        <p className="ml-3 mt-3 text-gray-600">Loading post data...</p> {/* Teks disesuaikan */}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen theme-hmj"> {/* Diubah ke theme-hmj */}
            <SidebarHMJ />
            <main className="ml-72 px-4 py-3 md:px-6 md:py-4 bg-gray-100 w-[calc(100%-18rem)] min-h-screen overflow-y-auto"> {/* Latar dan padding disesuaikan */}
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center mb-3"> {/* Margin bottom disesuaikan */}
                        <Link href="/pages-hmj/posts" className="text-gray-800 hover:text-rose-700 hover:bg-rose-100 mr-3 p-1 rounded-full transition-colors"> {/* Tombol kembali disesuaikan */}
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <h1 className="text-2xl font-semibold text-gray-800"> {/* Teks judul disesuaikan */}
                            {isEditing ? 'Edit Post' : 'Tambah Berita'}
                        </h1>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4"> {/* Spasi antar grup elemen form disesuaikan */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Gap antar kolom disesuaikan */}
                            {/* Main Content */}
                            <div className="md:col-span-2 space-y-4"> {/* Spasi antar card di kolom utama disesuaikan */}
                                <div className="bg-white rounded-lg shadow-xl p-3 md:p-4 border border-rose-500"> {/* Card disesuaikan */}
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Judul Berita</label> {/* Label disesuaikan */}
                                    <input
                                        type="text"
                                        required
                                        value={post.title}
                                        onChange={(e) => handleTitleChange(e.target.value)}
                                        className="w-full p-2 border border-rose-300 bg-gray-50 text-gray-800 rounded-md shadow-sm focus:outline-none text-sm" // Input disesuaikan
                                    />
                                </div>

                                <div className="bg-white rounded-lg shadow-xl p-3 md:p-4 border border-rose-500"> {/* Card disesuaikan */}
                                    <div className="flex justify-between items-center mb-3"> {/* Margin bottom disesuaikan */}
                                        <h3 className="text-lg font-medium text-gray-700">Isi Berita</h3> {/* Teks disesuaikan */}
                                        <button
                                            type="button"
                                            onClick={addSection}
                                            className="inline-flex items-center px-3 py-1 border border-rose-600 text-rose-700 rounded-md text-sm hover:bg-rose-100" // Tombol disesuaikan
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Tambah Bagian
                                        </button>
                                    </div>

                                    <div className="space-y-4"> {/* Spasi antar section disesuaikan */}
                                        {sections.map((section, index) => (
                                            <div key={index} className="border border-rose-200 rounded-lg p-3 bg-gray-50/50"> {/* Section disesuaikan */}
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="font-medium text-gray-700">Bagian Berita {index + 1}</h4> {/* Teks disesuaikan */}
                                                    <div className="flex space-x-2">
                                                        <button
                                                            type="button"
                                                            disabled={index === 0}
                                                            onClick={() => moveSection(index, 'up')}
                                                            className="p-1 text-gray-500 hover:text-rose-600 disabled:opacity-30" // Tombol disesuaikan
                                                        >
                                                            ↑
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={index === sections.length - 1}
                                                            onClick={() => moveSection(index, 'down')}
                                                            className="p-1 text-gray-500 hover:text-rose-600 disabled:opacity-30" // Tombol disesuaikan
                                                        >
                                                            ↓
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSection(index)}
                                                            className="p-1 text-red-600 hover:text-red-700" // Tombol disesuaikan
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <textarea
                                                    value={section.content}
                                                    onChange={(e) => handleSectionChange(index, e.target.value)}
                                                    className="w-full p-2 border border-rose-300 bg-gray-50 text-gray-800 rounded-md shadow-sm focus:outline-none text-sm" // Textarea disesuaikan
                                                    rows={8}
                                                />
                                                <div className="text-xs text-muted-foreground/80 mt-2"> {/* Warna teks disesuaikan */}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-4"> {/* Spasi antar card di sidebar disesuaikan */}
                                <div className="bg-white rounded-lg shadow-xl p-3 md:p-4 border border-rose-500"> {/* Card disesuaikan */}

                                    <div className="space-y-3"> {/* Spasi antar elemen di card sidebar disesuaikan */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">Status</label> {/* Label disesuaikan */}
                                            <select
                                                value={post.status}
                                                onChange={(e) => handlePostChange('status', e.target.value)}
                                                className="w-full p-2 border border-rose-300 bg-gray-50 text-gray-800 rounded-md shadow-sm focus:outline-none text-sm" // Select disesuaikan
                                            >
                                                <option value="draft">Draft</option>
                                                <option value="published">Published</option>
                                                <option value="archived">Archived</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1"> {/* Label disesuaikan */}
                                                <div className="flex items-center">
                                                    <Calendar className="w-4 h-4 mr-1" />
                                                    <span>Tanggal Publish</span>
                                                </div>
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={post.published_at ? new Date(post.published_at).toISOString().slice(0, 16) : ''}
                                                onChange={(e) => handlePostChange('published_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                                className="w-full p-2 border border-rose-300 bg-gray-50 text-gray-800 rounded-md shadow-sm focus:outline-none text-sm" // Input disesuaikan
                                                disabled={post.status !== 'published'}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow-xl p-3 md:p-4 border border-rose-500"> {/* Card disesuaikan */}

                                    <div className="space-y-3"> {/* Spasi antar elemen di card sidebar disesuaikan */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">Kategori</label> {/* Label disesuaikan */}
                                            <select
                                                required
                                                value={post.category_id}
                                                onChange={(e) => handlePostChange('category_id', e.target.value)}
                                                className="w-full p-2 border border-rose-300 bg-gray-50 text-gray-800 rounded-md shadow-sm focus:outline-none text-sm" // Select disesuaikan
                                            >
                                                <option value="">Pilih kategori</option>
                                                {categories.map(category => (
                                                    <option key={category.id} value={category.id}>
                                                        {category.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">URL Slug</label> {/* Label disesuaikan */}
                                            <input
                                                type="text"
                                                required
                                                value={post.slug}
                                                onChange={(e) => handlePostChange('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                                className="w-full p-2 border border-rose-300 bg-gray-50 text-gray-800 rounded-md shadow-sm focus:outline-none text-sm" // Input disesuaikan
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1"> {/* Label disesuaikan */}
                                                <div className="flex items-center">
                                                    <ImageIcon className="w-4 h-4 mr-1" />
                                                    <span>Image</span>
                                                </div>
                                            </label>

                                            {/* Tambahkan ini untuk debugging */}
                                            <div className="text-xs text-gray-500 mb-1"> {/* Teks disesuaikan */}
                                                Image URL: {post.post_image ? post.post_image : 'tidak ada'}
                                            </div>

                                            {post.post_image && (
                                                <img
                                                    src={post.post_image}
                                                    alt="Image"
                                                    className="mb-2 rounded-lg max-h-32 object-cover border border-rose-200 bg-gray-50" // Gambar disesuaikan, max-h dikurangi
                                                    onError={(e) => {
                                                        console.error('Error loading image', e);
                                                        e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Image+Error';
                                                    }}
                                                />
                                            )}

                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-rose-100 file:text-rose-700 hover:file:bg-rose-200" // Input file disesuaikan
                                            />
                                        </div>
                                    </div>
                                </div>
                                {/* Save Post Button Moved Here */}
                                <div className="flex justify-end mt-3"> {/* Margin top disesuaikan */}
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex items-center bg-rose-700 text-white hover:bg-rose-800 px-4 py-2 rounded-md transition duration-200 disabled:bg-rose-700/50 text-sm font-medium" // Tombol disesuaikan
                                    >
                                        {saving ? (
                                            <>
                                                <Clock className="animate-spin w-5 h-5 mr-2" />
                                                <span>Menyimpan...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Simpan</span>
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