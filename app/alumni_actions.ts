'use server';

import { createClient as createServerClient } from '@/utils/supabase/server'; // Untuk operasi DB umum
import { getAdminAuthClient } from '@/utils/supabase/admin-client'; // Untuk operasi auth admin
import { revalidatePath } from 'next/cache';
import { encodedRedirect } from '@/utils/utils'; // Import encodedRedirect

const ALUMNI_FOTO_BUCKET = 'alumni-photos'; // Nama bucket di Supabase Storage

// --- Tindakan untuk Manajemen Alumni oleh ADMIN ---
export async function addAlumniAction(formData: FormData) {
    const supabaseDbClient = await createServerClient(); // Client untuk operasi tabel alumni
    const adminAuthClient = getAdminAuthClient(); // Client untuk operasi auth admin

    const rawFormData = {
        email: formData.get('email') as string, // Asumsi admin input email
        password: formData.get('password') as string, // Asumsi admin input password
        nama: formData.get('nama') as string,
        prodi: formData.get('prodi') as string || null,
        angkatan: formData.get('angkatan') ? parseInt(formData.get('angkatan') as string) : null,
        pekerjaan: formData.get('pekerjaan') as string || null,
        // Testimoni dan foto diisi oleh alumni sendiri
    };

    if (!rawFormData.email || !rawFormData.password) {
        return encodedRedirect("error", "/pages-admin/data-management/alumni", "Email dan password alumni wajib diisi");
    }

    // 1. Buat user baru di Supabase Auth menggunakan admin client
    const { data: authData, error: authError } = await adminAuthClient.createUser({
        email: rawFormData.email,
        password: rawFormData.password,
        email_confirm: true, // Langsung konfirmasi email
        user_metadata: {
            full_name: rawFormData.nama,
            role: 'alumni',
        }
    });

    if (authError || !authData.user) {
        console.error('Auth createUser error (admin alumni):', authError);
        const message = authError?.message || 'Gagal membuat akun autentikasi alumni';
        return encodedRedirect("error", "/pages-admin/data-management/alumni", message);
    }

    // 2. Simpan data alumni ke tabel 'alumni' beserta user_id
    // Foto dan testimoni akan diisi oleh alumni sendiri nanti
    const { error: insertError } = await supabaseDbClient.from('alumni').insert({
        nama: rawFormData.nama,
        prodi: rawFormData.prodi,
        angkatan: rawFormData.angkatan,
        pekerjaan: rawFormData.pekerjaan,
        user_id: authData.user.id, // Tautkan dengan user_id dari Supabase Auth
    });

    if (insertError) {
        console.error('Insert alumni data error (admin):', insertError);
        // Jika insert gagal, idealnya user auth yang baru dibuat juga dihapus (rollback)
        await adminAuthClient.deleteUser(authData.user.id); // Coba hapus user auth
        return encodedRedirect("error", "/pages-admin/data-management/alumni", `Gagal menyimpan data alumni: ${insertError.message}`);
    }

    revalidatePath('/pages-admin/data-management/alumni');
    revalidatePath('/alumni'); // Revalidate halaman publik juga
    return encodedRedirect("success", "/pages-admin/data-management/alumni", "Data alumni berhasil ditambahkan");
}

export async function updateAlumniAction(formData: FormData) {
    const supabase = await createServerClient();
    const id = parseInt(formData.get('id') as string);
    const currentFotoPath = formData.get('current_foto') as string | null;

    const rawFormData = {
        nama: formData.get('nama') as string,
        prodi: formData.get('prodi') as string || null,
        angkatan: formData.get('angkatan') ? parseInt(formData.get('angkatan') as string) : null,
        pekerjaan: formData.get('pekerjaan') as string || null,
        testimoni: formData.get('testimoni') as string || null,
        fotoFile: formData.get('foto') as File | null,
        // Pertimbangkan field user_id jika admin bisa mengaitkan profil alumni dengan akun pengguna
        // user_id: formData.get('user_id') as string || null,
    };

    let fotoUrl: string | null = currentFotoPath;

    if (rawFormData.fotoFile && rawFormData.fotoFile.size > 0) {
        if (currentFotoPath) {
            const oldFileName = currentFotoPath.split('/').pop();
            if (oldFileName) await supabase.storage.from(ALUMNI_FOTO_BUCKET).remove([oldFileName]);
        }
        const fileName = `${Date.now()}-${rawFormData.fotoFile.name.replace(/\s/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from(ALUMNI_FOTO_BUCKET).upload(fileName, rawFormData.fotoFile);
        if (uploadError) {
            console.error('Upload error (admin):', uploadError);
            return encodedRedirect("error", "/pages-admin/data-management/alumni", "Gagal mengunggah foto baru");
        }
        const { data: publicUrlData } = supabase.storage.from(ALUMNI_FOTO_BUCKET).getPublicUrl(fileName);
        fotoUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase.from('alumni').update({
        nama: rawFormData.nama,
        prodi: rawFormData.prodi,
        angkatan: rawFormData.angkatan,
        pekerjaan: rawFormData.pekerjaan,
        testimoni: rawFormData.testimoni,
        foto: fotoUrl,
        // user_id: rawFormData.user_id,
        updated_at: new Date().toISOString(),
    }).eq('id', id);

    if (error) {
        console.error('Update error (admin):', error);
        return encodedRedirect("error", "/pages-admin/data-management/alumni", `Gagal memperbarui data alumni: ${error.message}`);
    }

    revalidatePath('/pages-admin/data-management/alumni');
    revalidatePath('/alumni'); // Revalidate halaman publik juga
    return encodedRedirect("success", "/pages-admin/data-management/alumni", "Data alumni berhasil diperbarui");
}

export async function deleteAlumniAction(formData: FormData) {
    const supabase = await createServerClient();
    const adminAuthClient = getAdminAuthClient(); // Pastikan admin client diinisialisasi
    const id = parseInt(formData.get('id') as string);
    const fotoPath = formData.get('foto_path') as string | null;

    // 1. Ambil data alumni, terutama user_id, sebelum menghapus record
    const { data: alumniData, error: fetchError } = await supabase
        .from('alumni')
        .select('user_id, nama, foto') // Ambil user_id, nama untuk pesan, dan foto untuk path jika fotoPath tidak ada
        .eq('id', id)
        .single();

    if (fetchError) {
        console.error('Error fetching alumni data for deletion:', fetchError);
        return encodedRedirect("error", "/pages-admin/data-management/alumni", `Gagal mengambil data alumni untuk dihapus: ${fetchError.message}`);
    }

    if (!alumniData) {
        return encodedRedirect("error", "/pages-admin/data-management/alumni", "Data alumni tidak ditemukan.");
    }

    const userIdToDelete = alumniData.user_id;
    const alumniName = alumniData.nama || "Alumni";
    const actualFotoPath = fotoPath || alumniData.foto; // Gunakan fotoPath dari form, atau dari DB jika tidak ada

    // 2. Hapus foto dari storage jika ada
    if (actualFotoPath) {
        const fileName = actualFotoPath.split('/').pop();
        if (fileName) {
            const { error: storageError } = await supabase.storage.from(ALUMNI_FOTO_BUCKET).remove([fileName]);
            if (storageError) {
                console.warn('Failed to delete alumni photo from storage, continuing deletion:', storageError);
                // Tidak menghentikan proses, hanya catat peringatan
            }
        }
    }

    // 3. Hapus data dari tabel 'alumni'
    const { error: deleteDbError } = await supabase.from('alumni').delete().eq('id', id);

    if (deleteDbError) {
        console.error('Delete alumni DB error (admin):', deleteDbError);
        return encodedRedirect("error", "/pages-admin/data-management/alumni", `Gagal menghapus data alumni ${alumniName}: ${deleteDbError.message}`);
    }

    // 4. Hapus pengguna dari Supabase Auth jika user_id ada
    if (userIdToDelete) {
        const { error: authDeleteError } = await adminAuthClient.deleteUser(userIdToDelete);
        if (authDeleteError) {
            console.error('Delete alumni auth user error:', authDeleteError);
            // Data alumni sudah terhapus, tapi akun auth gagal dihapus
            return encodedRedirect("error", "/pages-admin/data-management/alumni", `Data alumni ${alumniName} berhasil dihapus, tetapi akun autentikasinya gagal dihapus: ${authDeleteError.message}`);
        }
    }

    revalidatePath('/pages-admin/data-management/alumni');
    revalidatePath('/alumni'); // Revalidate halaman publik juga
    return encodedRedirect("success", "/pages-admin/data-management/alumni", `Data alumni ${alumniName} dan akunnya berhasil dihapus`);
}


// --- Tindakan untuk Manajemen Profil & Testimoni oleh ALUMNI SENDIRI ---

export interface AlumniProfileData {
    id: number;
    nama: string;
    prodi: string | null;
    angkatan: number | null;
    pekerjaan: string | null;
    testimoni: string | null;
    foto: string | null;
    user_id: string;
}

export async function getMyAlumniProfileWithTestimonial(): Promise<AlumniProfileData | null> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error("User not authenticated for getMyAlumniProfileWithTestimonial");
        return null;
    }

    const { data: alumniProfile, error } = await supabase
        .from('alumni')
        .select('id, nama, prodi, angkatan, pekerjaan, testimoni, foto, user_id')
        .eq('user_id', user.id)
        .single();

    if (error) {
        console.error('Error fetching current alumni profile:', error);
        return null;
    }
    return alumniProfile as AlumniProfileData;
}

export async function updateMyAlumniProfileAndTestimonial(formData: FormData) {
    const supabase = await createServerClient();
    const alumniId = formData.get('alumni_id') as string; // Ini adalah ID dari tabel 'alumni'
    const currentFotoPath = formData.get('current_foto_path') as string | null;

    // Ambil data user yang sedang login untuk validasi
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Pengguna tidak terautentikasi.' };

    // Validasi bahwa alumniId yang dikirim cocok dengan user yang login
    // Ini memerlukan query tambahan untuk memastikan user_id dari alumniId cocok dengan user.id
    const { data: existingAlumni, error: fetchError } = await supabase
        .from('alumni')
        .select('user_id')
        .eq('id', parseInt(alumniId))
        .single();

    if (fetchError || !existingAlumni || existingAlumni.user_id !== user.id) {
        console.error('Authorization error or alumni not found for update:', fetchError);
        return { error: 'Anda tidak diizinkan memperbarui profil ini atau profil tidak ditemukan.' };
    }

    const rawData = {
        nama: formData.get('nama') as string | undefined, // Bisa jadi tidak dikirim dari form testimoni saja
        prodi: formData.get('prodi') as string | undefined,
        angkatan: formData.get('angkatan') ? parseInt(formData.get('angkatan') as string) : undefined,
        pekerjaan: formData.get('pekerjaan') as string | undefined,
        testimoni: formData.get('testimoni') as string | null, // Bisa null untuk menghapus testimoni
        fotoFile: formData.get('foto') as File | null,
    };

    const dataToUpdate: { [key: string]: any } = {
        updated_at: new Date().toISOString(),
    };

    // Hanya tambahkan field ke dataToUpdate jika ada di formData
    if (formData.has('nama') && rawData.nama !== undefined) dataToUpdate.nama = rawData.nama;
    if (formData.has('prodi')) dataToUpdate.prodi = rawData.prodi || null; // Izinkan null
    if (formData.has('angkatan') && rawData.angkatan !== undefined) dataToUpdate.angkatan = rawData.angkatan;
    if (formData.has('pekerjaan')) dataToUpdate.pekerjaan = rawData.pekerjaan || null; // Izinkan null
    if (formData.has('testimoni')) dataToUpdate.testimoni = rawData.testimoni; // Bisa null

    let newFotoUrl: string | null = currentFotoPath;
    if (rawData.fotoFile && rawData.fotoFile.size > 0) {
        if (currentFotoPath) {
            const oldFileName = currentFotoPath.split('/').pop();
            if (oldFileName) await supabase.storage.from(ALUMNI_FOTO_BUCKET).remove([oldFileName]);
        }
        const fileName = `${Date.now()}-${rawData.fotoFile.name.replace(/\s/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from(ALUMNI_FOTO_BUCKET).upload(fileName, rawData.fotoFile);
        if (uploadError) return { error: `Gagal mengunggah foto baru: ${uploadError.message}` };
        const { data: publicUrlData } = supabase.storage.from(ALUMNI_FOTO_BUCKET).getPublicUrl(fileName);
        newFotoUrl = publicUrlData.publicUrl;
        dataToUpdate.foto = newFotoUrl; // Hanya update field foto jika ada file baru
    } else if (formData.has('foto') && (!rawData.fotoFile || rawData.fotoFile.size === 0) && currentFotoPath && !formData.get('foto')) {
        // Logika jika ingin menghapus foto dengan input file kosong (saat ini tidak diimplementasikan)
        // Jika ingin menghapus foto, Anda perlu cara eksplisit, misal checkbox 'hapus_foto'
        // Untuk saat ini, jika tidak ada file baru, foto lama dipertahankan (newFotoUrl = currentFotoPath)
        // dan dataToUpdate.foto tidak akan di-set kecuali newFotoUrl berbeda dari currentFotoPath.
    }
    // Hanya set dataToUpdate.foto jika newFotoUrl berbeda dari currentFotoPath (artinya ada perubahan)
    // atau jika currentFotoPath null dan newFotoUrl ada isinya (foto baru ditambahkan)
    if (newFotoUrl !== currentFotoPath) {
        dataToUpdate.foto = newFotoUrl;
    }


    // Pastikan ada sesuatu untuk diupdate selain updated_at
    if (Object.keys(dataToUpdate).length <= 1) {
        // Tidak ada perubahan yang dikirim selain updated_at
        // Anda bisa mengembalikan pesan sukses tanpa query DB, atau tetap update updated_at
        // return { success: 'Tidak ada perubahan data.' };
    }

    const { error: updateError } = await supabase.from('alumni')
        .update(dataToUpdate)
        .eq('id', parseInt(alumniId)); // Pastikan ini adalah ID dari tabel alumni

    if (updateError) {
        console.error('Update error (alumni self-service):', updateError);
        return { error: `Gagal memperbarui profil: ${updateError.message}` };
    }

    revalidatePath('/pages-alumni'); // Revalidate halaman profil alumni
    revalidatePath(`/pages-alumni/testimoni-alumni/edit/${alumniId}`);
    revalidatePath('/pages-alumni/testimoni-alumni');
    revalidatePath('/alumni'); // Revalidate halaman publik juga
    return { success: 'Profil dan testimoni berhasil diperbarui!' };
}

export async function deleteMyTestimonial(formData: FormData) {
    const supabase = await createServerClient();
    const alumniId = formData.get('alumni_id') as string;

    // Ambil data user yang sedang login untuk validasi
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Pengguna tidak terautentikasi.' };

    // Validasi bahwa alumniId yang dikirim cocok dengan user yang login
    const { data: existingAlumni, error: fetchError } = await supabase
        .from('alumni')
        .select('user_id')
        .eq('id', parseInt(alumniId))
        .single();

    if (fetchError || !existingAlumni || existingAlumni.user_id !== user.id) {
        console.error('Authorization error or alumni not found for delete testimonial:', fetchError);
        return { error: 'Anda tidak diizinkan menghapus testimoni ini atau profil tidak ditemukan.' };
    }

    const { error: updateError } = await supabase.from('alumni')
        .update({ testimoni: null, updated_at: new Date().toISOString() }) // Hanya hapus teks testimoni
        .eq('id', parseInt(alumniId));

    if (updateError) {
        console.error('Delete testimonial error (alumni self-service):', updateError);
        return { error: `Gagal menghapus testimoni: ${updateError.message}` };
    }

    revalidatePath('/pages-alumni');
    revalidatePath(`/pages-alumni/testimoni-alumni/edit/${alumniId}`);
    revalidatePath('/pages-alumni/testimoni-alumni');
    revalidatePath('/alumni'); // Revalidate halaman publik juga
    return { success: 'Testimoni berhasil dihapus!' };
}
