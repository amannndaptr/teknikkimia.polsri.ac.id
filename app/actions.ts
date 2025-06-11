// app/actions.ts

"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAuthClient } from "@/utils/supabase/admin-client";
import { revalidatePath } from "next/cache";

// Define roles that must be unique per class (mirroring the client-side list)
const UNIQUE_JABATAN_KELAS = [
    'Ketua Kelas',
    'Wakil Ketua Kelas',
    'Sekretaris',
    'Bendahara',
];


export const signUpAction = async (formData: FormData) => {
    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();
    const supabase = await createClient();
    const origin = (await headers()).get("origin");

    // Get additional mahasiswa data
    const nim = formData.get("nim")?.toString() || "";
    const nama = formData.get("nama")?.toString() || "";
    const kelas = formData.get("kelas")?.toString() || "";
    const jabatan_kelas = formData.get("jabatan_kelas")?.toString() || "";
    const angkatan = formData.get("angkatan")?.toString() || "";
    const prodi = formData.get("prodi")?.toString() || "";
    const fotoProfilFile = formData.get("foto_profil") as File;

    if (!email || !password) {
        return encodedRedirect(
            "error",
            "/sign-up",
            "Email and password are required",
        );
    }

    // Validate NIM format - Allow '304' or '404' in the expected position
    // Assumes NIM structure: 06<YY><PPPP><NNNN> where PPPP is the prodi code
    const nimPattern = /^06\d{2}(304\d|404\d)\d{4}$/;
    if (!nimPattern.test(nim)) {
        return encodedRedirect(
            "error",
            "/sign-up",
            "Format NIM tidak valid atau kode prodi tidak sesuai (harus 304x atau 404x).",
        );
    }
    
    // d:\New folder\si_tekkim\app\actions.ts (dalam signUpAction)
    // ...
    if (UNIQUE_JABATAN_KELAS.includes(jabatan_kelas)) {
        const { data: existingJabatan, error: jabatanError } = await supabase
            .from('mahasiswa')
            .select('id_mhs')
            .eq('kelas', kelas)
            .eq('prodi', prodi)
            .eq('jabatan_kelas', jabatan_kelas)
            .eq('angkatan', angkatan) // <-- Ini memastikan keunikan per angkatan
            .single();
    // ...
    
            if (existingJabatan) {
                // Logika jika jabatan sudah ada untuk kombinasi tersebut
                console.warn(`Jabatan ${jabatan_kelas} already exists for class ${kelas}, prodi ${prodi}, angkatan ${angkatan}. Signup prevented.`);
                return encodedRedirect(
                    "error",
                    "/sign-up",
                    `Jabatan ${jabatan_kelas} sudah ada untuk kelas ${kelas} (${prodi}) angkatan ${angkatan}. Silakan pilih jabatan lain.`
                );
            }

        if (jabatanError && jabatanError.code !== 'PGRST116') {
            // PGRST116 adalah kode error jika tidak ada baris yang ditemukan (yang diharapkan jika jabatan belum ada)
            console.error("Error checking jabatan during signup:", jabatanError);
             return encodedRedirect(
                 "error",
                 "/sign-up",
                 "An error occurred while checking class roles. Please try again."
             );
        }
    }
    // --- End of server-side validation ---



    // First perform the authentication signup
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${origin}/auth/callback`,
        },
    });

    if (error) {
        console.error(error.code + " " + error.message);
        return encodedRedirect("error", "/sign-up", error.message);
    }


    // If signup successful, process profile photo and add user to mahasiswa table
    if (data.user) {
        const userId = data.user.id;
        let foto_profil_url = "";

        // Handle file upload if a file was provided and is valid
        if (fotoProfilFile && fotoProfilFile.size > 0) {
            try {
                // Generate a unique filename
                const fileExt = fotoProfilFile.name.split('.').pop();
                // Use userId in filename for easier association and potential future cleanup
                const fileName = `mahasiswa-${userId}-${Date.now()}.${fileExt}`;

                // Upload to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase
                    .storage
                    .from('foto') // Make sure this bucket exists in your Supabase project
                    .upload(fileName, fotoProfilFile);

                if (uploadError) {
                    console.error("Error uploading file:", uploadError);
                    // Decide if file upload failure should stop the whole signup or just result in no foto
                    // For now, logging error and continuing without foto_profil_url
                } else if (uploadData) {
                    // Get the public URL of the uploaded file
                    const { data: urlData } = supabase
                        .storage
                        .from('foto')
                        .getPublicUrl(fileName);

                    foto_profil_url = urlData.publicUrl;
                }
            } catch (fileError) {
                console.error("File processing error:", fileError);
                // Log unexpected file errors
            }
        }

        // d:\New folder\si_tekkim\app\actions.ts (dalam signUpAction)
        // ...
        // Insert into mahasiswa table
        const { error: insertError } = await supabase
            .from('mahasiswa')
            .insert({
                id_mhs: userId,
                nim: nim,
                email: email, // Tambahkan kolom email di sini
                nama: nama,
                kelas: kelas,
                jabatan_kelas: jabatan_kelas,
                angkatan: angkatan, // ANGKATAN DISIMPAN DI SINI
                prodi: prodi,
                foto_profil: foto_profil_url
            });
        // ...
        

        if (insertError) {
            console.error("Error inserting mahasiswa data:", insertError);
            // IMPORTANT: If inserting into the 'mahasiswa' table fails AFTER Auth signup,
            // you might want to delete the Auth user here to prevent orphaned accounts.
            // This requires the admin client.
            const adminAuthClient = getAdminAuthClient(); // Get admin client
            const { error: deleteAuthUserError } = await adminAuthClient.deleteUser(userId);
            if (deleteAuthUserError) {
                console.error("Error cleaning up auth user after mahasiswa insert failure:", deleteAuthUserError);
            }
             return encodedRedirect(
                 "error",
                 "/sign-up",
                 "Signup successful, but failed to save student data. Please contact support."
             );
        }
    }

    // Redirect after successful signup and data insertion
    return encodedRedirect(
        "success",
        "/sign-in",
        "Thanks for signing up! Please check your email for a verification link.",
    );
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  // Attempt to sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  // User is authenticated at this point
  const userId = data.user.id;
  let userRole = "unknown";
  let userData = null;
  let redirectUrl = "/";
  let message = "";
  
  // Check if user is admin
  if (email === "kimia@polsri.ac.id") { // Admin Jurusan
    userRole = "admin";
    message = `Admin login successful: ${email}`;
    redirectUrl = "/pages-admin";
  } else if (email === "hmjteknikkimia@gmail.com") { // HMJ Teknik Kimia
    userRole = "hmj";
    message = `HMJ Teknik Kimia login successful: ${email}`;
    
    redirectUrl = "/pages-hmj"; 
  } else {
    // Check if user exists in dosen table
    const { data: dosenData, error: dosenError } = await supabase
      .from('dosen')
      .select('*')
      .eq('id_dsn', userId)
      .single();
    
    if (dosenData) {
      userRole = "dosen";
      userData = dosenData;
      message = `Dosen login successful: ${dosenData.nama} (${dosenData.nip})`;
      redirectUrl = "/pages-dosen";
    } else {
      // Check if user exists in mahasiswa table
      const { data: mahasiswaData, error: mahasiswaError } = await supabase
        .from('mahasiswa')
        .select('*')
        .eq('id_mhs', userId)
        .single();
      
      if (mahasiswaData) {
        userRole = "mahasiswa";
        userData = mahasiswaData;
        message = `Mahasiswa login successful: ${mahasiswaData.nama} (${mahasiswaData.nim})`;
        redirectUrl = "/pages-mahasiswa";
      } else {
        // Check if user exists in alumni table
        const { data: alumniData, error: alumniError } = await supabase
          .from('alumni')
          .select('*') // Anda bisa memilih kolom spesifik jika perlu
          .eq('user_id', userId) // Pastikan 'user_id' adalah kolom foreign key di tabel alumni
          .single();

        if (alumniData) {
          userRole = "alumni";
          userData = alumniData;
          // Sesuaikan pesan sukses jika perlu, misalnya menggunakan alumniData.nama
          message = `Alumni login successful: ${alumniData.nama}`;
          redirectUrl = "/pages-alumni"; // Ganti dengan path dashboard alumni yang benar
        } else {
          // Not an admin, not in dosen, mahasiswa, or alumni table
          message = "User account exists but not linked to any role";
          redirectUrl = "/profile/setup";
        }
      }
    }
  }
  
  // Store user role in session metadata for use throughout the app
  await supabase.auth.updateUser({
    data: { role: userRole }
  });
  
  // Redirect with success message
  return redirect(`${redirectUrl}?success=${encodeURIComponent(message)}`);
};

export const deleteMahasiswaAction = async (mahasiswaId: string) => {
    const supabase = await createClient();
    // Get the admin auth client for deleting the user
    const adminAuthClient = getAdminAuthClient();

    // Optional: Add an admin check here if only specific admins can delete
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user || user.email !== 'teknikkimia@polsri.ac.id') {
    //     return { success: false, message: "Only authorized users can delete student accounts" };
    // }

    if (!mahasiswaId) {
        return { success: false, message: "Mahasiswa ID is required for deletion" };
    }

    let mahasiswaName = "data mahasiswa"; // Default name for messages

    try {
        // 1. Fetch mahasiswa data to get name and photo URL before deleting the row
        const { data: mahasiswaData, error: fetchError } = await supabase
            .from('mahasiswa')
            .select('nama, foto_profil')
            .eq('id_mhs', mahasiswaId)
            .single();

        if (fetchError) {
            console.error("Error fetching mahasiswa data:", fetchError);
            // Decide if you should stop deletion if fetching fails.
            // For now, logging error and continuing, but message will be generic.
            // If you must have the name in the success message, you might return here.
        } else if (mahasiswaData) {
            mahasiswaName = mahasiswaData.nama || "data mahasiswa"; // Use fetched name if available

            // 2. Delete photo from storage if it exists
            if (mahasiswaData.foto_profil) {
                try {
                    // Extract the filename from the URL
                    const urlParts = mahasiswaData.foto_profil.split('/');
                    // Filename is the last part after the bucket name and folder (if any)
                    // Assuming URL format like: .../storage/v1/object/public/bucket_name/filename
                    // Or: .../storage/v1/object/public/bucket_name/folder/filename
                    // We need the path within the bucket, which is everything after the bucket name
                    const bucketName = 'foto'; // Your bucket name
                    const bucketIndex = urlParts.indexOf(bucketName);
                    if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
                         const filePathInBucket = urlParts.slice(bucketIndex + 1).join('/');

                         const { error: deleteStorageError } = await supabase
                             .storage
                             .from(bucketName)
                             .remove([filePathInBucket]);

                         if (deleteStorageError) {
                             console.error("Error deleting photo from storage:", deleteStorageError);
                             // Log error but continue with deleting data and auth user
                         }
                    } else {
                         console.warn("Could not extract file path from photo URL:", mahasiswaData.foto_profil);
                    }
                } catch (storageError) {
                    console.error("Unexpected error during photo deletion:", storageError);
                }
            }
        }


        // 3. Delete from mahasiswa table
        const { error: mahasiswaDeleteError } = await supabase
            .from('mahasiswa')
            .delete()
            .eq('id_mhs', mahasiswaId);

        if (mahasiswaDeleteError) {
            console.error("Error deleting from mahasiswa table:", mahasiswaDeleteError);
            // If database deletion fails, DO NOT attempt to delete the auth user yet.
            return { success: false, message: `Failed to delete ${mahasiswaName} data: ${mahasiswaDeleteError.message}` };
        }

        // 4. Delete user from auth system using admin client
        const { error: authDeleteError } = await adminAuthClient.deleteUser(mahasiswaId);

        if (authDeleteError) {
            console.error("Error deleting auth user:", authDeleteError);
            // Return partial success if auth deletion fails after data deletion
            return {
                success: false,
                partialSuccess: true,
                message: `${mahasiswaName} data deleted, but the user account could not be deleted: ${authDeleteError.message}`
            };
        }

        // 5. Return success if both data and auth user are deleted
        return { success: true, message: `${mahasiswaName} successfully deleted` };

    } catch (error: any) {
        console.error("Unexpected error during mahasiswa deletion:", error);
        return { success: false, message: "An unexpected error occurred during deletion: " + (error.message || "Unknown error") };
    }
}


export const forgotPasswordAction = async (formData: FormData) => {
    const email = formData.get("email")?.toString();
    const supabase = await createClient();
    const origin = (await headers()).get("origin");
    const callbackUrl = formData.get("callbackUrl")?.toString(); // This seems unused in the redirect below

    if (!email) {
        return encodedRedirect("error", "/forgot-password", "Email is required");
    }

    // The redirectTo URL should point to a page in your app that handles the password reset confirmation
    // and then redirects the user to the actual reset password form page.
    // The redirect_to parameter is passed to the auth/callback page.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
    });

    if (error) {
        console.error(error.message);
        return encodedRedirect(
            "error",
            "/forgot-password",
            "Could not reset password. Please check the email address.", // More user-friendly message
        );
    }

    // The original code had a redirect(callbackUrl) here, which seems incorrect
    // as the user needs to click the link in the email first.
    // The encodedRedirect below is more appropriate for confirming the email was sent.
    /*
    if (callbackUrl) {
      return redirect(callbackUrl); // This redirect happens immediately, likely not intended
    }
    */

    return encodedRedirect(
        "success",
        "/forgot-password",
        "Check your email for a link to reset your password.",
    );
};

export const resetPasswordAction = async (formData: FormData) => {
    const supabase = await createClient();

    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!password || !confirmPassword) {
        // Use return with encodedRedirect
        return encodedRedirect(
            "error",
            "/protected/reset-password",
            "Password and confirm password are required",
        );
    }

    if (password !== confirmPassword) {
         // Use return with encodedRedirect
        return encodedRedirect(
            "error",
            "/protected/reset-password",
            "Passwords do not match",
        );
    }

    // Update the user's password using the client from the server context
    // This works because the user is already authenticated via the reset password token
    const { error } = await supabase.auth.updateUser({
        password: password,
    });

    if (error) {
        console.error("Password update failed:", error);
         // Use return with encodedRedirect
        return encodedRedirect(
            "error",
            "/protected/reset-password",
            "Password update failed: " + error.message, // Include error message for debugging
        );
    }

    // Use return with encodedRedirect for success
    return encodedRedirect("success", "/protected/reset-password", "Password updated successfully. You can now sign in with your new password.");
};

// Action to change user's authentication password when logged in
export async function changePasswordAction(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser(); // Get the currently logged-in user

    // Ensure user is authenticated
    if (!user) {
        console.error("Change password failed: User not authenticated.");
        return { type: 'error', message: 'Anda tidak terautentikasi. Silakan login kembali.' };
    }

    // Get password data from the form
    // const current_password = formData.get('current_password')?.toString(); // Uncomment if required
    const new_password = formData.get('new_password')?.toString();
    const confirm_password = formData.get('confirm_password')?.toString();

    // Basic validation
    if (!new_password || !confirm_password) {
        return { type: 'error', message: 'Password baru dan konfirmasi password harus diisi.' };
    }

    if (new_password !== confirm_password) {
        return { type: 'error', message: 'Password baru dan konfirmasi password tidak cocok.' };
    }

    if (new_password.length < 6) { // Match Supabase default minimum length
         return { type: 'error', message: 'Password baru minimal 6 karakter.' };
    }

    // Optional: Verify current password (requires custom logic or a different auth method)
    // Supabase's updateUser does NOT require the current password by default.
    // If you need this, you'd typically re-authenticate the user first.
    // For simplicity, we'll proceed without verifying the current password here.


    // Update the user's password in Supabase Auth
    const { error } = await supabase.auth.updateUser({
        password: new_password,
    });

    if (error) {
        console.error("Error changing password:", error);
        // Supabase might return errors for weak passwords etc.
        return { type: 'error', message: `Gagal mengganti password: ${error.message}` };
    }

    console.log("Password changed successfully for user:", user.id);

    // Password change is a sensitive action, often requires re-authentication.
    // Supabase's update user might invalidate the current session or require re-login.
    // It's often a good idea to redirect the user to login after a password change.
    // However, Supabase's client will handle session updates automatically if successful.
    // We will just return a success message. Consider redirecting if needed based on your app's security flow.

    // Revalidate paths that might display user info or require auth
    revalidatePath('/pages-mahasiswa');
    revalidatePath('/pages-mahasiswa/settings');


    return { type: 'success', message: 'Password berhasil diganti!' };
}

export const signOutAction = async () => {
    const supabase = await createClient();
    await supabase.auth.signOut();
    // Always return redirect after sign out
    return redirect("/sign-in");
};