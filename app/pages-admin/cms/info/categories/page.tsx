// app/pages-admin/cms/categories/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Pencil, Trash2, PlusCircle, Save, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import SidebarAdmin from '@/components/SidebarAdmin'; // Import SidebarAdmin

interface Category {
    id: string;
    name: string;
    slug: string;
    created_at: string;
}

export default function CategoriesManagement() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newCategory, setNewCategory] = useState({ name: '', slug: '' });
    const [editCategory, setEditCategory] = useState({ name: '', slug: '' });
    const supabase = createClient();

    useEffect(() => {
        fetchCategories();
    }, []);

    async function fetchCategories() {
        setLoading(true);
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');
        if (error) {
            console.error('Error fetching categories:', error);
        } else {
            setCategories(data || []);
        }
        setLoading(false);
    }

    async function handleAddCategory(e: React.FormEvent) {
        e.preventDefault();
        if (!newCategory.name || !newCategory.slug) return;
        const { error } = await supabase
            .from('categories')
            .insert({
                name: newCategory.name,
                slug: newCategory.slug,
            });
        if (error) {
            console.error('Error adding category:', error);
            alert('Failed to add category');
        } else {
            setNewCategory({ name: '', slug: '' });
            setIsAddingNew(false);
            fetchCategories();
        }
    }

    async function handleUpdateCategory(e: React.FormEvent) {
        e.preventDefault();
        if (!editingId || !editCategory.name || !editCategory.slug) return;
        const { error } = await supabase
            .from('categories')
            .update({
                name: editCategory.name,
                slug: editCategory.slug,
            })
            .eq('id', editingId);
        if (error) {
            console.error('Error updating category:', error);
            alert('Failed to update category');
        } else {
            setEditingId(null);
            fetchCategories();
        }
    }

    async function handleDeleteCategory(id: string) {
        if (confirm('Are you sure you want to delete this category? This will affect all posts using this category.')) {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id);
            if (error) {
                console.error('Error deleting category:', error);
                alert('Failed to delete category');
            } else {
                fetchCategories();
            }
        }
    }

    function startEdit(category: Category) {
        setEditingId(category.id);
        setEditCategory({ name: category.name, slug: category.slug });
    }

    function handleNameChange(name: string, isNew: boolean) {
        if (isNew) {
            const slug = name.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
            setNewCategory({ name, slug });
        } else {
            const slug = editCategory.slug === '' || !editingId ?
                name.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-') :
                editCategory.slug;
            setEditCategory({ name, slug });
        }
    }

    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    }

    return (
        <div className="min-h-screen theme-admin">
            <SidebarAdmin />
            <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto">
                <div className="max-w-6xl mx-auto"> {/* Container asli dipertahankan di dalam main */}
                    <div className="flex justify-between items-center mb-8"> {/* Margin disesuaikan */}
                        <div className="flex items-center">
                            <Link href="/pages-admin/cms" className="mr-3 p-2 rounded-md hover:bg-muted transition-colors">
                                <ArrowLeft className="w-6 h-6 text-foreground" /> {/* Ukuran ikon dan warna disesuaikan */}
                            </Link>
                            <h1 className="text-3xl font-bold text-foreground">Kategori</h1> {/* Ukuran font disesuaikan */}
                        </div>
                        <button
                            onClick={() => setIsAddingNew(true)}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md flex items-center text-sm font-medium" // Styling disesuaikan
                            disabled={isAddingNew}
                        >
                            <PlusCircle className="w-5 h-5 mr-2" />
                            Tambah Kategori
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div> {/* Warna spinner disesuaikan */}
                        </div>
                    ) : (
                        <div className="bg-card rounded-lg shadow-md overflow-hidden border border-border"> {/* Styling card disesuaikan */}
                            {isAddingNew && (
                                <form onSubmit={handleAddCategory} className="border-b border-border p-4 bg-muted/30"> {/* Styling form disesuaikan */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-muted-foreground mb-1">Nama</label>
                                            <input
                                                type="text"
                                                value={newCategory.name}
                                                onChange={(e) => handleNameChange(e.target.value, true)}
                                                className="w-full px-3 py-2 border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring" // Styling input disesuaikan
                                                placeholder="Category name"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-muted-foreground mb-1">Slug</label>
                                            <input
                                                type="text"
                                                value={newCategory.slug}
                                                onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
                                                className="w-full px-3 py-2 border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring" // Styling input disesuaikan
                                                placeholder="category-slug"
                                                required
                                            />
                                        </div>
                                        <div className="flex items-end space-x-2">
                                            <button
                                                type="submit"
                                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center text-sm font-medium" // Styling tombol disesuaikan
                                            >
                                                <Save className="w-5 h-5 mr-2" />
                                                Simpan
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsAddingNew(false);
                                                    setNewCategory({ name: '', slug: '' });
                                                }}
                                                className="bg-muted hover:bg-muted/80 text-muted-foreground px-4 py-2 rounded-md flex items-center text-sm font-medium" // Styling tombol disesuaikan
                                            >
                                                <X className="w-5 h-5 mr-2" />
                                                Batal
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            )}

                            {categories.length === 0 && !isAddingNew ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    No categories found. Add your first category to get started.
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-muted/50"> {/* Styling thead disesuaikan */}
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Nama</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Slug</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Dibuat</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-card divide-y divide-border"> {/* Styling tbody disesuaikan */}
                                        {categories.map((category) => (
                                            <tr key={category.id} className="hover:bg-muted/30">
                                                {editingId === category.id ? (
                                                    <td colSpan={4}>
                                                        <form onSubmit={handleUpdateCategory} className="p-4 bg-muted/30"> {/* Styling form edit disesuaikan */}
                                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-muted-foreground mb-1">Nama</label>
                                                                    <input
                                                                        type="text"
                                                                        value={editCategory.name}
                                                                        onChange={(e) => handleNameChange(e.target.value, false)}
                                                                        className="w-full px-3 py-2 border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring" // Styling input disesuaikan
                                                                        placeholder="Category name"
                                                                        required
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-muted-foreground mb-1">Slug</label>
                                                                    <input
                                                                        type="text"
                                                                        value={editCategory.slug}
                                                                        onChange={(e) => setEditCategory({ ...editCategory, slug: e.target.value })}
                                                                        className="w-full px-3 py-2 border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring" // Styling input disesuaikan
                                                                        placeholder="category-slug"
                                                                        required
                                                                    />
                                                                </div>
                                                                <div className="flex items-end space-x-2">
                                                                    <button
                                                                        type="submit"
                                                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center text-sm font-medium" // Styling tombol disesuaikan
                                                                    >
                                                                        <Save className="w-5 h-5 mr-2" />
                                                                        Perbarui
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setEditingId(null)}
                                                                        className="bg-muted hover:bg-muted/80 text-muted-foreground px-4 py-2 rounded-md flex items-center text-sm font-medium" // Styling tombol disesuaikan
                                                                    >
                                                                        <X className="w-5 h-5 mr-2" />
                                                                        Batal
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </form>
                                                    </td>
                                                ) : (
                                                    <>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-foreground">{category.name}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-muted-foreground">{category.slug}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-muted-foreground">{formatDate(category.created_at)}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <div className="flex justify-end space-x-2">
                                                                <button
                                                                    onClick={() => startEdit(category)}
                                                                    className="text-primary hover:text-primary/80" // Styling tombol disesuaikan
                                                                >
                                                                    <Pencil className="w-5 h-5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteCategory(category.id)}
                                                                    className="text-destructive hover:text-destructive/80" // Styling tombol disesuaikan
                                                                >
                                                                    <Trash2 className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}