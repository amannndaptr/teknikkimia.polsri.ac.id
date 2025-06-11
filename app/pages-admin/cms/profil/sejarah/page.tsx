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
} from '@/components/ui/table';
import SidebarAdmin from '@/components/SidebarAdmin'; // Import SidebarAdmin
import { Trash2, Edit, History } from 'lucide-react'; // Archive tidak digunakan, jadi saya hapus

interface SejarahMilestone {
  id: string;
  tahun: string;
  keterangan: string | null;
  urutan: number | null;
  created_at: string;
}

// Kolom deskripsi sekarang menjadi bagian dari SejarahMilestone, tapi opsional
interface SejarahItem extends SejarahMilestone {
  judul_utama: string | null;
  paragraf_intro_1: string | null;
  paragraf_intro_2: string | null;
  judul_perjalanan_singkat: string | null;
  paragraf_perjalanan_singkat: string | null;
}

const initialMilestoneFormData: Omit<SejarahMilestone, 'id' | 'created_at'> = {
  tahun: '',
  keterangan: '',
  urutan: 0,
};

const initialDeskripsiFormData: Pick<SejarahItem, 'judul_utama' | 'paragraf_intro_1' | 'paragraf_intro_2' | 'judul_perjalanan_singkat' | 'paragraf_perjalanan_singkat'> = {
  judul_utama: '',
  paragraf_intro_1: '',
  paragraf_intro_2: '',
  judul_perjalanan_singkat: '',
  paragraf_perjalanan_singkat: '',
};
const DESKRIPSI_TAHUN_MARKER = 'DESKRIPSI_UMUM_SEJARAH'; // Penanda unik untuk baris deskripsi
let deskripsiItemId: string | null = null; // Akan diisi dengan ID baris deskripsi jika ada

export default function SejarahCMSPage() {
  const supabase = createClient();
  const [milestones, setMilestones] = useState<SejarahMilestone[]>([]);
  const [milestoneFormData, setMilestoneFormData] = useState(initialMilestoneFormData);
  const [deskripsiFormData, setDeskripsiFormData] = useState(initialDeskripsiFormData);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [isSubmittingMilestone, setIsSubmittingMilestone] = useState(false);
  const [isSubmittingDeskripsi, setIsSubmittingDeskripsi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('cms_sejarah')
      .select('*')
      .order('urutan', { ascending: true })
      .order('tahun', { ascending: true });

    if (fetchError) {
      console.error('Error fetching sejarah data:', fetchError);
      setError('Gagal memuat data sejarah.');
      setMilestones([]);
      setDeskripsiFormData(initialDeskripsiFormData);
    } else {
      const allItems = data || [];
      const deskripsiItem = allItems.find(item => item.tahun === DESKRIPSI_TAHUN_MARKER) as SejarahItem | undefined;
      const regularMilestones = allItems.filter(item => item.tahun !== DESKRIPSI_TAHUN_MARKER);

      setMilestones(regularMilestones);

      if (deskripsiItem) {
        deskripsiItemId = deskripsiItem.id; // Simpan ID baris deskripsi
        setDeskripsiFormData({
          judul_utama: deskripsiItem.judul_utama || '',
          paragraf_intro_1: deskripsiItem.paragraf_intro_1 || '',
          paragraf_intro_2: deskripsiItem.paragraf_intro_2 || '',
          judul_perjalanan_singkat: deskripsiItem.judul_perjalanan_singkat || '',
          paragraf_perjalanan_singkat: deskripsiItem.paragraf_perjalanan_singkat || '',
        });
      } else {
        deskripsiItemId = null;
        setDeskripsiFormData(initialDeskripsiFormData);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    setError(null); // Reset error global saat load
    setSuccess(null); // Reset success global saat load
    fetchData();
  }, []);

  const handleMilestoneInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMilestoneFormData((prev) => ({
      ...prev,
      [name]: name === 'urutan' ? (value === '' ? null : parseInt(value, 10)) : value,
    }));
  };

  const handleDeskripsiInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDeskripsiFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetMilestoneForm = () => {
    setMilestoneFormData(initialMilestoneFormData);
    setEditingMilestoneId(null);
    // setError(null); // Sebaiknya error & success tidak direset di sini agar pesan global tetap terlihat
    // setSuccess(null);
  };

  const handleMilestoneSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!milestoneFormData.tahun) {
      setError('Tahun untuk tonggak sejarah wajib diisi.');
      setSuccess(null);
      return;
    }

    setIsSubmittingMilestone(true);
    setError(null);
    setSuccess(null);

    const dataToSubmit = {
      tahun: milestoneFormData.tahun,
      keterangan: milestoneFormData.keterangan,
      urutan: milestoneFormData.urutan === null ? 0 : milestoneFormData.urutan,
    };

    if (editingMilestoneId) {
      const { error: updateError } = await supabase
        .from('cms_sejarah')
        .update(dataToSubmit)
        .eq('id', editingMilestoneId);

      if (updateError) {
        console.error('Supabase update error:', updateError);
        setError(
          `Gagal memperbarui tonggak sejarah: ${
            updateError.message || 'Error tidak diketahui dari Supabase.'
          }`
        );
      } else {
        setSuccess('Tonggak sejarah berhasil diperbarui.');
        resetMilestoneForm();
        fetchData(); // Muat ulang semua data
      }
    } else {
      const { error: insertError } = await supabase.from('cms_sejarah').insert(dataToSubmit);
      if (insertError) {
        console.error('Supabase insert error:', insertError);
        setError(
          `Gagal menyimpan tonggak sejarah: ${
            insertError.message || 'Error tidak diketahui dari Supabase.'
          }`
        );
      } else {
        setSuccess('Tonggak sejarah berhasil disimpan.');
        resetMilestoneForm();
        fetchData(); // Muat ulang semua data
      }
    }
    setIsSubmittingMilestone(false);
  };

  const handleDeskripsiSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingDeskripsi(true);
    setError(null);
    setSuccess(null);

    const dataToSubmit = {
      ...deskripsiFormData,
      tahun: DESKRIPSI_TAHUN_MARKER, // Penanda khusus
      // Kolom lain seperti 'keterangan' & 'urutan' bisa null atau default untuk baris deskripsi
      keterangan: null,
      urutan: -1, // Atau nilai lain yang menandakan ini bukan milestone biasa
    };

    const { error: upsertError } = await supabase
      .from('cms_sejarah')
      .upsert(deskripsiItemId ? { ...dataToSubmit, id: deskripsiItemId } : dataToSubmit, 
              { onConflict: 'id', ignoreDuplicates: false }); // Jika ada ID, update. Jika tidak, insert.

    if (upsertError) {
      console.error('Error saving deskripsi:', upsertError);
      setError(`Gagal menyimpan deskripsi halaman: ${upsertError.message}`);
    } else {
      setSuccess('Deskripsi halaman berhasil disimpan.');
      fetchData(); // Muat ulang semua data
    }
    setIsSubmittingDeskripsi(false);
  };

  const handleEditMilestone = (milestone: SejarahMilestone) => {
    setEditingMilestoneId(milestone.id);
    setMilestoneFormData({
      tahun: milestone.tahun,
      keterangan: milestone.keterangan || '',
      urutan: milestone.urutan === null ? 0 : milestone.urutan,
    });
    setError(null);
    setSuccess(null);
    // Scroll ke form tonggak sejarah jika diperlukan
    const milestoneFormElement = document.getElementById('milestone-form-card');
    milestoneFormElement?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus tonggak sejarah ini?')) return;

    // setIsSubmittingMilestone(true); // Atau gunakan state loading terpisah untuk delete
    setError(null);
    setSuccess(null);
    const { error: deleteError } = await supabase.from('cms_sejarah').delete().eq('id', id);

    if (deleteError) {
      setError(`Gagal menghapus tonggak sejarah: ${deleteError.message}`);
    } else {
      setSuccess('Tonggak sejarah berhasil dihapus.');
      fetchData(); // Muat ulang semua data
    }
    // setIsSubmittingMilestone(false);
  };

  return (
    <div className="min-h-screen theme-admin">
      <SidebarAdmin />
      <main className="ml-72 px-4 py-6 md:px-6 md:py-8 bg-background w-[calc(100%-18rem)] min-h-screen overflow-y-auto">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold mb-8 flex items-center text-foreground">
            <History className="mr-3 w-6 h-6 text-primary" /> Manajemen Sejarah
          </h1>

          {error && <p className="text-destructive bg-destructive/10 p-3 rounded-md mb-4 text-sm">{error.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}</p>}
          {success && <p className="text-green-600 dark:text-green-400 bg-green-500/10 p-3 rounded-md mb-4 text-sm">{success}</p>}

          {loading && !milestones.length && !deskripsiFormData.judul_utama ? ( // Kondisi loading awal yang lebih spesifik
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="ml-3 text-muted-foreground">Memuat data halaman sejarah...</p>
            </div>
          ) : (
            <>
              {/* Form untuk Deskripsi Halaman */}
              <Card className="mb-8 bg-card border-border shadow-lg">
                <form onSubmit={handleDeskripsiSubmit}>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="judul_utama" className="text-muted-foreground">Judul Utama Halaman</Label>
                      <Input id="judul_utama" name="judul_utama" value={deskripsiFormData.judul_utama || ''} onChange={handleDeskripsiInputChange} className="bg-background border-input text-foreground" />
                    </div>
                    <div>
                      <Label htmlFor="paragraf_intro_1" className="text-muted-foreground">Paragraf 1</Label>
                      <Textarea id="paragraf_intro_1" name="paragraf_intro_1" value={deskripsiFormData.paragraf_intro_1 || ''} onChange={handleDeskripsiInputChange} rows={3} className="bg-background border-input text-foreground" />
                    </div>
                    <div>
                      <Label htmlFor="paragraf_intro_2" className="text-muted-foreground">Paragraf 2</Label>
                      <Textarea id="paragraf_intro_2" name="paragraf_intro_2" value={deskripsiFormData.paragraf_intro_2 || ''} onChange={handleDeskripsiInputChange} rows={3} className="bg-background border-input text-foreground" />
                    </div>
                    <div>
                      <Label htmlFor="judul_perjalanan_singkat" className="text-muted-foreground">Judul Bagian "Perjalanan Singkat"</Label>
                      <Input id="judul_perjalanan_singkat" name="judul_perjalanan_singkat" value={deskripsiFormData.judul_perjalanan_singkat || ''} onChange={handleDeskripsiInputChange} className="bg-background border-input text-foreground" />
                    </div>
                    <div>
                      <Label htmlFor="paragraf_perjalanan_singkat" className="text-muted-foreground">Paragraf Bagian "Perjalanan Singkat"</Label>
                      <Textarea id="paragraf_perjalanan_singkat" name="paragraf_perjalanan_singkat" value={deskripsiFormData.paragraf_perjalanan_singkat || ''} onChange={handleDeskripsiInputChange} rows={4} className="bg-background border-input text-foreground" />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button type="submit" disabled={isSubmittingDeskripsi || loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                      {isSubmittingDeskripsi ? 'Menyimpan Deskripsi...' : 'Simpan Perubahan'}
                      {isSubmittingDeskripsi && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current ml-2"></span>}
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              {/* Form dan Tabel untuk Tonggak Sejarah */}
              <Card className="mb-8 bg-card border-border shadow-lg" id="milestone-form-card">
                <CardHeader>
                  <CardTitle className="text-xl text-card-foreground">{editingMilestoneId ? 'Edit Tonggak Sejarah' : 'Tambah Tonggak Sejarah Baru'}</CardTitle>
                </CardHeader>
                <form onSubmit={handleMilestoneSubmit}>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="tahun" className="text-muted-foreground">Tahun/Periode <span className="text-destructive">*</span></Label>
                      <Input id="tahun" name="tahun" value={milestoneFormData.tahun} onChange={handleMilestoneInputChange} required className="bg-background border-input text-foreground" />
                    </div>
                    <div>
                      <Label htmlFor="keterangan" className="text-muted-foreground">Keterangan</Label>
                      <Textarea id="keterangan" name="keterangan" value={milestoneFormData.keterangan || ''} onChange={handleMilestoneInputChange} rows={3} className="bg-background border-input text-foreground" />
                    </div>
                    <div>
                      <Label htmlFor="urutan" className="text-muted-foreground">Urutan Tampilan (angka kecil tampil dulu)</Label>
                      <Input id="urutan" name="urutan" type="number" value={milestoneFormData.urutan === null ? '' : milestoneFormData.urutan} onChange={handleMilestoneInputChange} placeholder="Contoh: 0, 1, 10" className="bg-background border-input text-foreground" />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button type="submit" disabled={isSubmittingMilestone || loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                      {isSubmittingMilestone ? 'Menyimpan...' : (editingMilestoneId ? 'Perbarui Tonggak' : 'Simpan Perubahan')}
                      {isSubmittingMilestone && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current ml-2"></span>}
                    </Button>
                    {editingMilestoneId && (
                      <Button type="button" variant="outline" onClick={resetMilestoneForm} className="ml-2 border-border text-foreground hover:bg-muted" disabled={isSubmittingMilestone}>
                        Batal Edit / Form Baru
                      </Button>
                    )}
                  </CardFooter>
                </form>
              </Card>

              <Card className="bg-card border-border shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl text-card-foreground">Daftar Tonggak Sejarah</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading && !milestones.length ? ( // Ini untuk loading data tabel, bukan loading awal page
                    <div className="flex justify-center items-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="ml-2 text-muted-foreground">Memuat data tonggak sejarah...</p>
                    </div>
                  ) : milestones.length === 0 && !loading ? (
                    <p className="text-muted-foreground">Belum ada data tonggak sejarah yang tersimpan.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="text-muted-foreground">Urutan</TableHead>
                          <TableHead className="text-muted-foreground">Tahun</TableHead>
                          <TableHead className="text-muted-foreground">Keterangan</TableHead>
                          <TableHead className="text-right text-muted-foreground">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {milestones.map((item) => (
                          <TableRow key={item.id} className="border-border hover:bg-muted/50">
                            <TableCell className="text-foreground">{item.urutan}</TableCell>
                            <TableCell className="font-medium text-foreground">{item.tahun}</TableCell>
                            <TableCell className="text-foreground">{item.keterangan || '-'}</TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="outline" size="sm" onClick={() => handleEditMilestone(item)} disabled={isSubmittingMilestone || isSubmittingDeskripsi} className="border-border text-foreground hover:bg-muted">
                                <Edit size={16} className="mr-1" /> Edit
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteMilestone(item.id)} disabled={isSubmittingMilestone || isSubmittingDeskripsi || loading}>
                                <Trash2 size={16} className="mr-1" /> Hapus
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card> {/* Corrected closing tag for the "Daftar Tonggak Sejarah" Card */}
            </>
          )}
        </div>
      </main>
    </div>
  );
}