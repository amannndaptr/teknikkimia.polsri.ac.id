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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SidebarAdmin from '@/components/SidebarAdmin'; // Import SidebarAdmin
import { UploadCloud, FileText, Trash2, Edit, BookOpen } from 'lucide-react';

interface ProdiContent {
  id_prodi: string; // UUID
  title: string;
  deskripsi: string | null;
  visi: string | null;
  misi: string | null;
  tujuan: string | null;
  profil_lulusan: string | null;
  file: string | null; // URL file
  created_at: string;
}

const initialFormData: Omit<ProdiContent, 'id_prodi' | 'created_at' | 'file'> & { file_url: string | null } = {
  title: '',
  deskripsi: '',
  visi: '',
  misi: '',
  tujuan: '',
  profil_lulusan: '',
  file_url: null, // Untuk menampilkan nama file yang sudah ada
};

const PRODI_OPTIONS = [
  "D3 Teknik Kimia",
  "D4 Teknik Energi",
  "D4 Teknologi Kimia Industri",
  "S2 Energi Terbarukan",
  "D3 Teknik Kimia PSDKU SIAK",
  // Tambahkan prodi lain jika ada
];

export default function ProdiCMSPage() {
  const supabase = createClient();
  const [selectedProdiTitle, setSelectedProdiTitle] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentProdiId, setCurrentProdiId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpecificProdiContent = async () => {
      if (!selectedProdiTitle) {
        setFormData(prev => ({ ...initialFormData, title: '' }));
        setCurrentProdiId(null);
        setSelectedFile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setSuccess(null);

      const { data, error: fetchError } = await supabase
        .from('cms_prodi')
        .select('*')
        .eq('title', selectedProdiTitle)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching prodi content:', fetchError);
        setError(`Gagal memuat data untuk prodi ${selectedProdiTitle}.`);
        setFormData(prev => ({ ...initialFormData, title: selectedProdiTitle }));
        setCurrentProdiId(null);
      } else if (data) {
        setFormData({
          title: data.title,
          deskripsi: data.deskripsi || '',
          visi: data.visi || '',
          misi: data.misi || '',
          tujuan: data.tujuan || '',
          profil_lulusan: data.profil_lulusan || '',
          file_url: data.file || null,
        });
        setCurrentProdiId(data.id_prodi);
      } else {
        setFormData(prev => ({ ...initialFormData, title: selectedProdiTitle }));
        setCurrentProdiId(null);
      }
      setSelectedFile(null);
      setLoading(false);
    };

    if (selectedProdiTitle) {
      fetchSpecificProdiContent();
    } else {
      setFormData(prev => ({ ...initialFormData, title: '' }));
      setCurrentProdiId(null);
      setSelectedFile(null);
      setLoading(false);
    }
  }, [selectedProdiTitle, supabase]);

  const handleProdiSelectionChange = (prodiTitle: string) => {
    setSelectedProdiTitle(prodiTitle);
    setError(null);
    setSuccess(null);
    setSelectedFile(null);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; // files is FileList | null
    if (files && files.length > 0) {
      const firstFile = files[0]; // firstFile is File
      setSelectedFile(firstFile);
      setFormData(prev => ({ ...prev, file_url: firstFile.name }));
    } else {
      setSelectedFile(null);
      // Consider if formData.file_url should be reset here if the user deselects a file.
      // For example, if editing, you might want to revert to the original DB file_url.
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProdiTitle) {
      setError('Silakan pilih Program Studi terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    let fileUrl: string | null = formData.file_url;

    if (selectedFile) {
      const filePath = `prodi/${selectedProdiTitle.replace(/\s+/g, '_')}/${selectedFile.name}`;

      if (currentProdiId && formData.file_url && !formData.file_url.startsWith('blob:') && formData.file_url !== selectedFile.name) {
        try {
          const oldFileStoragePath = new URL(formData.file_url).pathname.split('/prodi/')[1];
          if (oldFileStoragePath) {
            await supabase.storage.from('prodi').remove([oldFileStoragePath]);
          }
        } catch (storageError) {
          console.warn('Could not remove old file from storage:', storageError);
        }
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('prodi')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        setError(`Gagal mengunggah file: ${uploadError.message}`);
        setIsSubmitting(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from('prodi').getPublicUrl(filePath);
      fileUrl = publicUrlData.publicUrl;
    } else if (currentProdiId && !selectedFile && formData.file_url && formData.file_url.startsWith('blob:')) {
      // This case means a file was selected then deselected, and we are editing.
      // We should revert to the original file_url if it exists, or set to null.
      // For simplicity, if no new file is selected, and we are editing, we keep the existing file_url
      // The current logic for `fileUrl` initialization already handles this.
      // If the user clears the file input AND there was an old file, we might want to set fileUrl to null
      // to indicate deletion. This needs more specific UI/UX.
      // For now, if selectedFile is null, fileUrl remains as formData.file_url (which is the old one if editing)
    }


    const dataToSubmit = {
      title: selectedProdiTitle, // Always use the selected prodi title
      deskripsi: formData.deskripsi,
      visi: formData.visi,
      misi: formData.misi,
      tujuan: formData.tujuan,
      profil_lulusan: formData.profil_lulusan,
      file: fileUrl,
    };

    const operationData = currentProdiId ? { ...dataToSubmit, id_prodi: currentProdiId } : dataToSubmit;

    const { error: upsertError } = await supabase
      .from('cms_prodi')
      .upsert(operationData, { onConflict: 'title' });

    if (upsertError) {
      setError(`Gagal menyimpan data prodi: ${upsertError.message}`);
      if (selectedFile && fileUrl && fileUrl.includes(selectedFile.name)) {
        try {
          const uploadedFilePath = new URL(fileUrl).pathname.split('/prodi/')[1];
          if (uploadedFilePath) await supabase.storage.from('prodi').remove([uploadedFilePath]);
        } catch (cleanupError) {
          console.warn('Failed to cleanup orphaned file after DB upsert error:', cleanupError);
        }
      }
    } else {
      setSuccess(`Data untuk prodi ${selectedProdiTitle} berhasil disimpan.`);
      const { data: newData, error: fetchNewDataError } = await supabase.from('cms_prodi').select('id_prodi, file').eq('title', selectedProdiTitle).single();
      if (newData) {
        setCurrentProdiId(newData.id_prodi);
        // Update formData.file_url with the actual stored URL if a new file was uploaded
        // or if the file was potentially removed (fileUrl would be null)
        setFormData(prev => ({ ...prev, file_url: newData.file || null }));
      }
      setSelectedFile(null);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!currentProdiId || !selectedProdiTitle) {
      setError("Tidak ada prodi yang dipilih untuk dihapus.");
      return;
    }
    if (!window.confirm(`Apakah Anda yakin ingin menghapus data prodi "${selectedProdiTitle}" beserta filenya (jika ada)?`)) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    if (formData.file_url && formData.file_url.startsWith('http')) {
      try {
        const pathParts = new URL(formData.file_url).pathname.split('/prodi/');
        const fullStoragePath = pathParts.length > 1 ? pathParts[1] : null;
        if (fullStoragePath) {
          const { error: storageError } = await supabase.storage.from('prodi').remove([fullStoragePath]);
          if (storageError) console.warn('Could not delete file from storage, proceeding with DB deletion:', storageError);
        }
      } catch (e) {
        console.warn('Error parsing file path for deletion:', e);
      }
    }

    const { error: dbError } = await supabase.from('cms_prodi').delete().eq('id_prodi', currentProdiId);

    if (dbError) {
      setError(`Gagal menghapus data prodi dari database: ${dbError.message}`);
    } else {
      setSuccess(`Data prodi ${selectedProdiTitle} berhasil dihapus.`);
      setSelectedProdiTitle(null); // This will trigger useEffect to reset form
      // setFormData(initialFormData); // Handled by useEffect
      // setCurrentProdiId(null); // Handled by useEffect
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen theme-admin">
      <SidebarAdmin />
      <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold mb-8 flex items-center text-foreground">
            <BookOpen className="mr-3 w-6 h-6" /> Manajemen Program Studi
            {selectedProdiTitle && !loading && ` - ${selectedProdiTitle}`}
          </h1>

          {error && <p className="text-destructive bg-destructive/10 p-3 rounded-md mb-4 text-sm">{error}</p>}
          {success && <p className="text-green-600 dark:text-green-400 bg-green-500/10 p-3 rounded-md mb-4 text-sm">{success}</p>}

          <Card className="mb-6 bg-card border-border shadow-lg">
            <CardHeader className="pb-1"> {/* Padding bawah dikurangi lagi menjadi pb-1 */}
              <CardTitle className="text-xl text-card-foreground">Pilih Program Studi</CardTitle>
            </CardHeader>
            <CardContent className="pt-1"> {/* Padding atas dikurangi lagi menjadi pt-1 */}
              <Select onValueChange={handleProdiSelectionChange} value={selectedProdiTitle || undefined}>
                <SelectTrigger className="w-full md:w-1/2 bg-background border-input text-foreground">
                  <SelectValue placeholder="-- Pilih Program Studi --" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  {PRODI_OPTIONS.map(prodi => (
                    <SelectItem key={prodi} value={prodi} className="hover:bg-muted focus:bg-muted">
                      {prodi}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {loading && selectedProdiTitle && (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="ml-3 text-lg text-muted-foreground">Memuat data untuk {selectedProdiTitle}...</p>
            </div>
          )}

          {selectedProdiTitle && !loading && (
            <form onSubmit={handleSubmit}>
              <Card className="mb-6 bg-card border-border shadow-lg">
                {/* CardHeader kosong dihilangkan */}
                <CardContent className="pt-2 space-y-4"> {/* Padding atas dikurangi menjadi pt-2, space-y-4 tetap untuk jarak antar field */}
                  <div>
                    <Label htmlFor="deskripsi" className="text-muted-foreground">Deskripsi</Label>
                    <Textarea id="deskripsi" name="deskripsi" value={formData.deskripsi || ''} onChange={handleInputChange} rows={3} className="bg-background border-input text-foreground" />
                  </div>
                  <div>
                    <Label htmlFor="visi" className="text-muted-foreground">Visi</Label>
                    <Textarea id="visi" name="visi" value={formData.visi || ''} onChange={handleInputChange} rows={3} className="bg-background border-input text-foreground" />
                  </div>
                  <div>
                    <Label htmlFor="misi" className="text-muted-foreground">Misi (pisahkan per poin dengan baris baru)</Label>
                    <Textarea id="misi" name="misi" value={formData.misi || ''} onChange={handleInputChange} rows={5} className="bg-background border-input text-foreground" />
                  </div>
                  <div>
                    <Label htmlFor="tujuan" className="text-muted-foreground">Tujuan (pisahkan per poin dengan baris baru)</Label>
                    <Textarea id="tujuan" name="tujuan" value={formData.tujuan || ''} onChange={handleInputChange} rows={3} className="bg-background border-input text-foreground" />
                  </div>
                  <div>
                    <Label htmlFor="profil_lulusan" className="text-muted-foreground">Profil Lulusan (pisahkan per poin dengan baris baru)</Label>
                    <Textarea id="profil_lulusan" name="profil_lulusan" value={formData.profil_lulusan || ''} onChange={handleInputChange} rows={3} className="bg-background border-input text-foreground" />
                  </div>
                  <div>
                    <Label htmlFor="file" className="text-muted-foreground">Sertifikat Akreditasi</Label>
                    <Input id="file" type="file" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" className="bg-background border-input text-foreground file:text-primary file:font-medium" />
                    {formData.file_url && (
                      <p className="text-sm text-muted-foreground mt-1">
                        File saat ini: {selectedFile ? selectedFile.name : (formData.file_url.startsWith('http') ? decodeURIComponent(formData.file_url.split('/').pop() || '') : formData.file_url)}
                        {!selectedFile && formData.file_url.startsWith('http') && (
                          <a href={formData.file_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline">
                            (Lihat)
                          </a>
                        )}
                      </p>
                    )}
                  </div>
                </CardContent>
                {/* CardFooter dihilangkan dari sini */}
              </Card>
              {/* Tombol Submit sekarang di luar Card, tapi masih di dalam form */}
              <div className="mt-6 flex justify-end">
                <Button type="submit" disabled={isSubmitting || loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {isSubmitting ? 'Menyimpan...' : (currentProdiId ? 'Simpan Perubahan' : 'Simpan Konten Prodi Baru')}
                  {isSubmitting && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current ml-2"></span>}
                </Button>
              </div>
            </form>
          )}

          {!selectedProdiTitle && !loading && (
            <p className="text-center text-muted-foreground mt-10">Silakan pilih program studi untuk mulai mengelola konten.</p>
          )}
        </div>
      </main>
    </div>
  );
}
