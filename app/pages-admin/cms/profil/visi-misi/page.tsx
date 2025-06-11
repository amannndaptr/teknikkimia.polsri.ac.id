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
import SidebarAdmin from '@/components/SidebarAdmin'; // Import SidebarAdmin
import { Target, ListChecks, PlusCircle, Trash2 } from 'lucide-react'; // Mengganti ikon

interface VisiMisiKonten {
  id: string; // Akan selalu 'konten_utama'
  judul_utama: string | null;
  paragraf_pengantar: string | null;
  judul_visi: string | null;
  isi_visi: string | null;
  judul_misi: string | null;
  poin_misi: string[]; // Array of strings
  updated_at?: string;
}

const initialFormData: Omit<VisiMisiKonten, 'id' | 'updated_at'> = {
  judul_utama: '',
  paragraf_pengantar: '',
  judul_visi: 'Visi',
  isi_visi: '',
  judul_misi: 'Misi',
  poin_misi: [''], // Mulai dengan satu poin misi kosong
};

const KONTEN_ID = 'konten_utama';

export default function VisiMisiCMSPage() {
  const supabase = createClient();
  const [formData, setFormData] = useState<Omit<VisiMisiKonten, 'id' | 'updated_at'>>(initialFormData);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('cms_visi_misi')
      .select('*')
      .eq('id', KONTEN_ID)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: no rows found
      console.error('Error fetching Visi Misi content:', fetchError);
      setError('Gagal memuat konten Visi Misi.');
    } else if (data) {
      setFormData({
        ...data,
        poin_misi: Array.isArray(data.poin_misi) ? data.poin_misi : [''], // Pastikan poin_misi adalah array
      });
    } else {
      setFormData(initialFormData); // Jika tidak ada data, gunakan initial
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePoinMisiChange = (index: number, value: string) => {
    const newPoinMisi = [...formData.poin_misi];
    newPoinMisi[index] = value;
    setFormData((prev) => ({ ...prev, poin_misi: newPoinMisi }));
  };

  const addPoinMisi = () => {
    setFormData((prev) => ({ ...prev, poin_misi: [...prev.poin_misi, ''] }));
  };

  const removePoinMisi = (index: number) => {
    if (formData.poin_misi.length <= 1) return; // Jangan hapus jika hanya satu
    const newPoinMisi = formData.poin_misi.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, poin_misi: newPoinMisi }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const dataToSubmit = {
      ...formData,
      id: KONTEN_ID,
      poin_misi: formData.poin_misi.filter(poin => poin.trim() !== ''), // Hanya simpan poin yang tidak kosong
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from('cms_visi_misi')
      .upsert(dataToSubmit, { onConflict: 'id' });

    if (upsertError) {
      console.error('Error saving Visi Misi content:', upsertError);
      setError(`Gagal menyimpan konten: ${upsertError.message}`);
    } else {
      setSuccess('Konten Visi dan Misi berhasil disimpan.');
      fetchData(); // Re-fetch data
    }
    setIsSubmitting(false);
  };

  if (loading) {
    // Loading state with sidebar
    return (
        <div className="min-h-screen theme-admin">
            <SidebarAdmin />
            <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto flex justify-center items-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="ml-3 mt-4 text-muted-foreground">Memuat data Visi & Misi...</p>
                </div>
            </main>
        </div>
    );
  }

  return (
    <div className="min-h-screen theme-admin">
      <SidebarAdmin />
      <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto">
        <div className="container mx-auto"> {/* Container asli dipertahankan di dalam main */}
          <h1 className="text-2xl font-bold mb-4 flex items-center text-foreground"> {/* Margin bottom dikurangi lagi menjadi mb-4 */}
            <Target className="mr-3 w-6 h-6" /> Manajemen Visi dan Misi
          </h1>

          {error && <p className="text-destructive bg-destructive/10 p-3 rounded-md mb-4 text-sm">{error}</p>}
          {success && <p className="text-green-600 dark:text-green-400 bg-green-500/10 p-3 rounded-md mb-4 text-sm">{success}</p>}

          <form onSubmit={handleSubmit}>
            <Card className="mb-8 bg-card border-border shadow-lg">
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="judul_utama" className="text-muted-foreground">Judul Utama Halaman</Label>
                  <Input id="judul_utama" name="judul_utama" value={formData.judul_utama || ''} onChange={handleInputChange} className="bg-background border-input text-foreground" />
                </div>
                <div>
                  <Label htmlFor="paragraf_pengantar" className="text-muted-foreground">Paragraf Pengantar</Label>
                  <Textarea id="paragraf_pengantar" name="paragraf_pengantar" value={formData.paragraf_pengantar || ''} onChange={handleInputChange} rows={3} className="bg-background border-input text-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="mb-8 bg-card border-border shadow-lg">
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="judul_visi" className="text-muted-foreground">Judul Bagian Visi</Label>
                  <Input id="judul_visi" name="judul_visi" value={formData.judul_visi || ''} onChange={handleInputChange} className="bg-background border-input text-foreground" />
                </div>
                <div>
                  <Label htmlFor="isi_visi" className="text-muted-foreground">Isi Visi</Label>
                  <Textarea id="isi_visi" name="isi_visi" value={formData.isi_visi || ''} onChange={handleInputChange} rows={4} className="bg-background border-input text-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="mb-8 bg-card border-border shadow-lg">
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="judul_misi" className="text-muted-foreground">Judul Bagian Misi</Label>
                  <Input id="judul_misi" name="judul_misi" value={formData.judul_misi || ''} onChange={handleInputChange} className="bg-background border-input text-foreground" />
                </div>
                {formData.poin_misi.map((poin, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Textarea
                      placeholder={`Poin Misi ${index + 1}`}
                      value={poin}
                      onChange={(e) => handlePoinMisiChange(index, e.target.value)}
                      rows={2}
                      className="bg-background border-input text-foreground"
                    />
                    {formData.poin_misi.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removePoinMisi(index)} aria-label="Hapus poin misi">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addPoinMisi} className="mt-2 border-border text-foreground hover:bg-muted">
                  <PlusCircle className="mr-2 h-4 w-4" /> Tambah Poin Misi
                </Button>
              </CardContent>
            </Card>

            <div className="mt-6 flex justify-end"> {/* CardFooter dihilangkan, diganti div dengan margin atas dan flexbox untuk alignment */}
              <Button type="submit" disabled={isSubmitting || loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                {isSubmitting && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current ml-2"></span>}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}