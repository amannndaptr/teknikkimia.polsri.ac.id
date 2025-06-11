'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'; // Removed UploadCloud as it's not used
import { Trash2, Edit, Award, PlusCircle, ArrowLeft } from 'lucide-react'; // Added ArrowLeft
import Image from 'next/image';
import SidebarAdmin from '@/components/SidebarAdmin'; // Import SidebarAdmin

interface ScholarshipData {
  id: string; // UUID
  name: string;
  short_name: string | null;
  provider: string;
  logo_url: string | null;
  description: string | null;
  general_eligibility: string[]; // Di-handle sebagai string dengan newline di textarea
  benefits: string[]; // Di-handle sebagai string dengan newline di textarea
  website_url: string | null;
  contact_info: string | null;
  storage_path_logo: string | null;
  created_at: string;
}

// Untuk form, eligibility dan benefits akan jadi string tunggal
type ScholarshipFormData = Omit<ScholarshipData, 'id' | 'created_at' | 'logo_url' | 'storage_path_logo' | 'general_eligibility' | 'benefits'> & {
  general_eligibility_text: string;
  benefits_text: string;
  current_logo_url?: string | null; // Untuk menampilkan logo yang sudah ada
};

const initialFormData: ScholarshipFormData = {
  name: '',
  short_name: '',
  provider: '',
  description: '',
  general_eligibility_text: '',
  benefits_text: '',
  website_url: '',
  contact_info: '',
  current_logo_url: null,
};

export default function BeasiswaCMSPage() {
  const supabase = createClient();
  const [scholarships, setScholarships] = useState<ScholarshipData[]>([]);
  const [formData, setFormData] = useState<ScholarshipFormData>(initialFormData);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'hidden' | 'add' | 'edit'>('hidden');

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchScholarships = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('cms_beasiswa')
      .select('*')
      .order('name', { ascending: true });

    if (fetchError) {
      console.error('Error fetching scholarships:', fetchError);
      setError('Gagal memuat daftar beasiswa.');
    } else {
      setScholarships(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchScholarships();
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedLogoFile(files[0]);
      setFormData(prev => ({ ...prev, current_logo_url: URL.createObjectURL(files[0]) })); // Preview
    } else {
      setSelectedLogoFile(null);
      // Jika file dibatalkan, kembalikan ke logo lama jika ada (saat edit)
      const originalScholarship = scholarships.find(s => s.id === editingId);
      setFormData(prev => ({ ...prev, current_logo_url: originalScholarship?.logo_url || null }));
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedLogoFile(null);
    setEditingId(null);
    setError(null);
    setSuccess(null);
    // setFormMode('hidden'); // No, resetForm should only reset data, not UI state like formMode
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name || !formData.provider) {
      setError('Nama Beasiswa dan Penyedia wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    let logoUrl: string | null = formData.current_logo_url || null;
    let storagePathLogo: string | null = editingId ? scholarships.find(s => s.id === editingId)?.storage_path_logo || null : null;

    if (selectedLogoFile) {
      const fileName = `${Date.now()}_${selectedLogoFile.name.replace(/\s+/g, '_')}`;
      const filePath = `beasiswa_logos/${fileName}`;

      // Hapus logo lama jika ada dan logo baru diunggah
      if (editingId && storagePathLogo) {
        await supabase.storage.from('beasiswa').remove([storagePathLogo]); // Ganti 'beasiswa' dengan nama bucket Anda
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('beasiswa') // Ganti 'beasiswa' dengan nama bucket Anda
        .upload(filePath, selectedLogoFile, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        setError(`Gagal mengunggah logo: ${uploadError.message}`);
        setIsSubmitting(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from('beasiswa').getPublicUrl(filePath); // Ganti 'beasiswa'
      logoUrl = publicUrlData.publicUrl;
      storagePathLogo = filePath;
    }

    const dataToSubmit = {
      name: formData.name,
      short_name: formData.short_name,
      provider: formData.provider,
      description: formData.description,
      general_eligibility: formData.general_eligibility_text.split('\n').filter(s => s.trim() !== ''),
      benefits: formData.benefits_text.split('\n').filter(s => s.trim() !== ''),
      website_url: formData.website_url,
      contact_info: formData.contact_info,
      logo_url: logoUrl,
      storage_path_logo: storagePathLogo,
    };

    let operationError: any = null;

    if (editingId) {
      const { error: updateError } = await supabase
        .from('cms_beasiswa')
        .update(dataToSubmit)
        .eq('id', editingId);
      if (updateError) {
        setError(`Gagal memperbarui beasiswa: ${updateError.message}`);
        operationError = updateError;
      } else {
        setSuccess('Beasiswa berhasil diperbarui.');
      }
    } else {
      const { error: insertError } = await supabase.from('cms_beasiswa').insert(dataToSubmit);
      if (insertError) {
        setError(`Gagal menyimpan beasiswa baru: ${insertError.message}`);
        operationError = insertError;
      } else {
        setSuccess('Beasiswa baru berhasil disimpan.');
      }
    }

    setIsSubmitting(false);
    if (!operationError) {
        resetForm();
        setFormMode('hidden'); // Hide form on successful operation
        fetchScholarships();
    }
  };

  const handleEdit = (scholarship: ScholarshipData) => {
    setFormMode('edit');
    setEditingId(scholarship.id);
    setFormData({
      name: scholarship.name,
      short_name: scholarship.short_name || '',
      provider: scholarship.provider,
      description: scholarship.description || '',
      general_eligibility_text: scholarship.general_eligibility?.join('\n') || '',
      benefits_text: scholarship.benefits?.join('\n') || '',
      website_url: scholarship.website_url || '',
      contact_info: scholarship.contact_info || '',
      current_logo_url: scholarship.logo_url,
    });
    setSelectedLogoFile(null);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (scholarship: ScholarshipData) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus beasiswa "${scholarship.name}"?`)) return;

    // Hapus logo dari storage jika ada
    if (scholarship.storage_path_logo) {
      const { error: storageError } = await supabase.storage.from('beasiswa').remove([scholarship.storage_path_logo]); // Ganti 'beasiswa'
      if (storageError) console.warn('Gagal menghapus logo dari storage:', storageError.message);
    }

    const { error: dbError } = await supabase.from('cms_beasiswa').delete().eq('id', scholarship.id);

    if (dbError) {
      setError(`Gagal menghapus beasiswa: ${dbError.message}`);
    } else {
      setSuccess(`Beasiswa "${scholarship.name}" berhasil dihapus.`);
      fetchScholarships();
      if (editingId === scholarship.id) {
        resetForm();
        setFormMode('hidden'); // Hide form if the item being edited was deleted
      }
    }
  };

  const handleAddNewClick = () => {
    resetForm(); // Clear any previous data and editingId
    setFormMode('add');
    window.scrollTo(0, 0); // Scroll to top to show the form
  };


  return (
    <div className="min-h-screen theme-admin">
      <SidebarAdmin />
      <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto">
        <div className="container mx-auto"> {/* Container asli dipertahankan di dalam main */}
          <div className={`flex justify-between items-center ${formMode === 'hidden' ? 'mb-8' : 'mb-0'}`}> {/* Wrapper untuk judul dan tombol tambah */}
            {formMode === 'hidden' && (
              <h1 className="text-2xl font-bold flex items-center text-foreground">
                <Award className="mr-3 w-6 h-6" /> Manajemen Beasiswa
              </h1>
            )}
            {/* Tombol Tambah Beasiswa Baru sekarang sejajar dengan judul */}
            {formMode === 'hidden' && (
              <Button onClick={handleAddNewClick} title="Tambah Beasiswa Baru" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <PlusCircle size={18} />
                Tambah Beasiswa
              </Button>
            )}
          </div>

          {error && <p className="text-destructive bg-destructive/10 p-3 rounded-md mb-4 text-sm">{error}</p>}
          {success && <p className="text-green-600 dark:text-green-400 bg-green-500/10 p-3 rounded-md mb-4 text-sm">{success}</p>}

          {(formMode === 'add' || formMode === 'edit') && (
            <form onSubmit={handleSubmit} className="mb-6">
              <div className="flex items-center mb-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => { resetForm(); setFormMode('hidden'); }}
                  className="text-foreground hover:bg-muted"
                  aria-label="Kembali"
                ><ArrowLeft size={20} /></Button>
                <h2 className="text-xl font-semibold text-foreground">{formMode === 'edit' ? 'Edit Beasiswa' : 'Tambah Beasiswa Baru'}</h2>
              </div>
              <Card className="mb-6 bg-card border-border shadow-lg">
                {/* CardHeader dihapus karena judul sudah di luar */}
                <CardContent className="space-y-3 pt-6"> {/* Tambahkan pt-6 untuk padding atas jika CardHeader dihapus */}
                  <div><Label htmlFor="name" className="text-muted-foreground">Nama Beasiswa<span className="text-destructive">*</span></Label><Input id="name" name="name" value={formData.name} onChange={handleInputChange} required className="bg-background border-input text-foreground" /></div>
                  <div><Label htmlFor="short_name" className="text-muted-foreground">Nama Pendek/Singkatan</Label><Input id="short_name" name="short_name" value={formData.short_name || ''} onChange={handleInputChange} className="bg-background border-input text-foreground" /></div>
                  <div><Label htmlFor="provider" className="text-muted-foreground">Penyedia<span className="text-destructive">*</span></Label><Input id="provider" name="provider" value={formData.provider} onChange={handleInputChange} required className="bg-background border-input text-foreground" /></div>
                  <div><Label htmlFor="description" className="text-muted-foreground">Deskripsi</Label><Textarea id="description" name="description" value={formData.description || ''} onChange={handleInputChange} rows={3} className="bg-background border-input text-foreground" /></div>
                  <div><Label htmlFor="general_eligibility_text" className="text-muted-foreground">Kriteria Umum</Label><Textarea id="general_eligibility_text" name="general_eligibility_text" value={formData.general_eligibility_text} onChange={handleInputChange} rows={4} className="bg-background border-input text-foreground" /></div>
                  <div><Label htmlFor="benefits_text" className="text-muted-foreground">Manfaat</Label><Textarea id="benefits_text" name="benefits_text" value={formData.benefits_text} onChange={handleInputChange} rows={4} className="bg-background border-input text-foreground" /></div>
                  <div><Label htmlFor="website_url" className="text-muted-foreground">URL Website Resmi</Label><Input id="website_url" name="website_url" type="url" value={formData.website_url || ''} onChange={handleInputChange} className="bg-background border-input text-foreground" /></div>
                  <div><Label htmlFor="contact_info" className="text-muted-foreground">Info Kontak</Label><Textarea id="contact_info" name="contact_info" value={formData.contact_info || ''} onChange={handleInputChange} rows={2} className="bg-background border-input text-foreground" /></div>
                  <div>
                    <Label htmlFor="logo" className="text-muted-foreground">Logo Penyedia</Label>
                    <Input id="logo" type="file" onChange={handleLogoFileChange} accept="image/*" className="bg-background border-input text-foreground file:text-primary file:font-medium" />
                    {formData.current_logo_url && (
                      <div className="mt-2">
                        <Image src={formData.current_logo_url} alt="Preview Logo" width={100} height={100} className="object-contain border border-border rounded bg-muted/30" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <div className="mt-0 flex justify-end">
                  <Button type="submit" disabled={isSubmitting || loading} className="ml-2 bg-primary text-primary-foreground hover:bg-primary/90">
                    {isSubmitting ? 'Menyimpan...' : (formMode === 'edit' ? 'Perbarui Beasiswa' : 'Simpan Beasiswa Baru')}
                  </Button>
              </div>
            </form>
          )}

          {formMode === 'hidden' && (
            <Card className="bg-card border-border shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-card-foreground">Daftar Semua Beasiswa</CardTitle>
              </CardHeader>
              <CardContent>
                {loading && !scholarships.length ? (
                  <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="ml-2 text-muted-foreground">Memuat...</p>
                  </div>
                ) : scholarships.length === 0 ? (
                  <p className="text-muted-foreground">Belum ada data beasiswa.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow className="border-border bg-muted"><TableHead className="text-muted-foreground">Nama Beasiswa</TableHead><TableHead className="text-muted-foreground">Penyedia</TableHead><TableHead className="text-muted-foreground">Logo</TableHead><TableHead className="text-center text-muted-foreground">Aksi</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {scholarships.map((s) => (
                        <TableRow key={s.id} className="border-border">
                          <TableCell className="font-medium text-foreground">{s.name} ({s.short_name || '-'})</TableCell>
                          <TableCell className="text-foreground">{s.provider}</TableCell>
                          <TableCell>
                            {s.logo_url ? <Image src={s.logo_url} alt={`Logo ${s.provider}`} width={50} height={50} className="object-contain bg-muted/30 rounded" /> : '-'}
                          </TableCell>
                          <TableCell className="flex items-center justify-end space-x-2">
                            <Button variant="outline" size="icon" onClick={() => handleEdit(s)} className="border-border text-foreground hover:bg-muted w-8 h-8"><Edit size={14} /></Button>
                            <Button variant="destructive" size="icon" onClick={() => handleDelete(s)} className="w-7 h-7"><Trash2 size={11} /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}