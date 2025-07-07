// app/actions/dosen_actions.ts

"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAuthClient } from "@/utils/supabase/admin-client";
import { revalidatePath } from "next/cache";

export const addDosenAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const adminAuthClient = getAdminAuthClient();
  const origin = (await headers()).get("origin");

  // Get dosen data
  const nip = formData.get("nip")?.toString() || "";
  const nama = formData.get("nama")?.toString() || "";
  const nidn = formData.get("nidn")?.toString() || "";
  const nuptk = formData.get("nuptk")?.toString() || "";
  const prodi = formData.get("prodi")?.toString() || "";
  const status_dosen = formData.get("status_dosen")?.toString() || "";
  const role = formData.get("role")?.toString() || "Dosen";
  const fotoUrl = formData.get("foto")?.toString() || "";

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/pages-admin/data-management/dosen",
      "Email and password are required",
    );
  }

  // First, create the user in Auth
  const { data: authData, error: authError } = await adminAuthClient.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: role.toLowerCase()
    }
  });

  if (authError) {
    console.error(authError.message);
    return encodedRedirect("error", "/pages-admin/data-management/dosen", authError.message);
  }

  // If signup successful, add user to dosen table
  if (authData.user) {
    const userId = authData.user.id;
    // Insert into dosen table
    const { error: insertError } = await supabase
      .from('dosen')
      .insert({
        id_dsn: userId,
        email: email,
        nip: nip,
        nama: nama,
        nidn: nidn,
        nuptk: nuptk,
        prodi: prodi,
        status_dosen: status_dosen,
        foto: fotoUrl,
        role: role
      });
    if (insertError) {
      console.error("Error inserting dosen data:", insertError);
      // Clean up auth user if dosen table insertion fails
      const { error: deleteUserError } = await adminAuthClient.deleteUser(userId);
      if (deleteUserError) {
        console.error("Error cleaning up auth user:", deleteUserError);
      }
      return encodedRedirect(
        "error",
        "/pages-admin/data-management/dosen",
        "Failed to add dosen data: " + insertError.message,
      );
    }
  }

  return encodedRedirect(
    "success",
    "/pages-admin/data-management/dosen",
    `Dosen ${nama} berhasil ditambahkan. Email verifikasi telah dikirim ke ${email}`,
  );
};

export const updateDosenAction = async (formData: FormData) => {
  const id_dsn = formData.get("id_dsn")?.toString();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();
  const supabase = await createClient();
  const adminAuthClient = getAdminAuthClient();

  // Get dosen data
  const nip = formData.get("nip")?.toString() || "";
  const nama = formData.get("nama")?.toString() || "";
  const nidn = formData.get("nidn")?.toString() || "";
  const nuptk = formData.get("nuptk")?.toString() || "";
  const prodi = formData.get("prodi")?.toString() || "";
  const status_dosen = formData.get("status_dosen")?.toString() || "";
  const role = formData.get("role")?.toString() || "Dosen";
  const fotoUrl = formData.get("foto")?.toString() || formData.get("current_foto")?.toString() || "";

  if (!id_dsn || !email || !nama || !nip) {
    return encodedRedirect(
      "error",
      "/pages-admin/data-management/dosen",
      "ID, Email, Nama, and NIP are required",
    );
  }

  // Update dosen table
  const { error: updateError } = await supabase
    .from('dosen')
    .update({
      email: email,
      nip: nip,
      nama: nama,
      nidn: nidn,
      nuptk: nuptk,
      prodi: prodi,
      status_dosen: status_dosen,
      foto: fotoUrl,
      role: role
    })
    .eq('id_dsn', id_dsn);

  if (updateError) {
    console.error("Error updating dosen data:", updateError);
    return encodedRedirect(
      "error",
      "/pages-admin/data-management/dosen",
      "Failed to update dosen data: " + updateError.message,
    );
  }
  
  // Update email in auth if it changed
  // Fetch current email from DB to compare
  const { data: currentDosenData, error: fetchError } = await supabase
    .from('dosen')
    .select('email')
    .eq('id_dsn', id_dsn)
    .single();
  
  if (fetchError) {
      console.error("Error fetching current email for auth update check:", fetchError);
      // Continue with password update if any, but warn about potential auth email mismatch
  } else if (currentDosenData && currentDosenData.email !== email) {
    // Email has changed, update auth email and role metadata
    const { error: updateAuthError } = await adminAuthClient.updateUserById(
      id_dsn,
      { 
        email: email,
        user_metadata: { role: role.toLowerCase() } // Update role in user metadata as well
      }
    );
    
    if (updateAuthError) {
      console.error("Error updating auth email:", updateAuthError);
      return encodedRedirect( // Ubah menjadi error
        "error", // Ubah dari success ke error
        "/pages-admin/data-management/dosen",
        `Data dosen ${nama} berhasil diperbarui, tetapi gagal memperbarui email di sistem autentikasi: ${updateAuthError.message}`, // Pesan error yang lebih jelas
      );
    } 
  } else {
    // Email did not change, just update the role in user metadata
    const { error: updateMetadataError } = await adminAuthClient.updateUserById(
      id_dsn,
      { 
        user_metadata: { role: role.toLowerCase() }
      }
    );
    
    if (updateMetadataError) {
      console.error("Error updating user metadata:", updateMetadataError);
      // This is less critical, just log the error and continue
    }
  }
  
  // Update password if provided
  if (password && confirmPassword && password === confirmPassword) {
    const { error: passwordError } = await adminAuthClient.updateUserById(
      id_dsn,
      { password: password }
    );
    
    if (passwordError) {
      console.error("Error updating password:", passwordError);
      return encodedRedirect(
        "success", // Data updated, but password failed
        "/pages-admin/data-management/dosen",
        `Data dosen ${nama} berhasil diperbarui tetapi gagal memperbarui password: ${passwordError.message}`,
      );
    }
    
    // Success message when password is also updated
    return encodedRedirect(
      "success",
      "/pages-admin/data-management/dosen",
      `Data dosen ${nama} berhasil diperbarui termasuk password`,
    );
  }
  
  // Default success message when only data (and maybe role metadata) is updated
  return encodedRedirect(
    "success",
    "/pages-admin/data-management/dosen",
    `Data dosen ${nama} berhasil diperbarui`,
  );
};

export const deleteDosenAction = async (formData: FormData) => {
  const id_dsn = formData.get("id_dsn")?.toString();
  const supabase = await createClient();
  const adminAuthClient = getAdminAuthClient();
  
  // Check if the current user is the admin
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || user.email !== 'kimia@polsri.ac.id') {
    return encodedRedirect(
      "error",
      "/pages-admin/data-management/dosen",
      "Only kimia@polsri.ac.id can delete dosen accounts"
    );
  }

  if (!id_dsn) {
    return encodedRedirect(
      "error",
      "/pages-admin/data-management/dosen",
      "ID dosen is required for deletion"
    );
  }

  try {
    // First, get the dosen data to retrieve information and any photo URL
    const { data: dosenData, error: fetchError } = await supabase
      .from('dosen')
      .select('nama, foto')
      .eq('id_dsn', id_dsn)
      .single();

    if (fetchError) {
      console.error("Error fetching dosen data:", fetchError);
      return encodedRedirect(
        "error",
        "/pages-admin/data-management/dosen",
        "Failed to retrieve dosen data: " + fetchError.message
      );
    }

    // Delete photo from storage if it exists
    if (dosenData.foto) {
      try {
        // Extract the filename from the URL
        // Assuming URL format like: .../storage/v1/object/public/bucket_name/filename
        // Or: .../storage/v1/object/public/bucket_name/folder/filename
        // We need the path within the bucket, which is everything after the bucket name
        const urlParts = dosenData.foto.split('/');
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
             console.warn("Could not extract file path from photo URL:", dosenData.foto);
        }
      } catch (storageError) {
          console.error("Unexpected error during photo deletion:", storageError);
      }
    }

    // Delete from dosen table
    const { error: deleteError } = await supabase
      .from('dosen')
      .delete()
      .eq('id_dsn', id_dsn);

    if (deleteError) {
      console.error("Error deleting dosen data:", deleteError);
      return encodedRedirect(
        "error",
        "/pages-admin/data-management/dosen",
        "Failed to delete dosen data: " + deleteError.message
      );
    }

    // Delete the user from auth.users
    const { error: authDeleteError } = await adminAuthClient.deleteUser(id_dsn);

    if (authDeleteError) {
      console.error("Error deleting auth user:", authDeleteError);
      return encodedRedirect(
        "error",
        "/pages-admin/data-management/dosen",
        `Dosen data deleted but the auth account may still exist: ${authDeleteError.message}`
      );
    }

    return encodedRedirect(
      "success",
      "/pages-admin/data-management/dosen",
      `Dosen ${dosenData.nama} has been successfully deleted`
    );
  } catch (error: any) {
    // Periksa apakah error adalah sinyal redirect dari Next.js
    // Error redirect biasanya memiliki 'digest' yang spesifik atau message 'NEXT_REDIRECT'
    if (error.digest?.startsWith('NEXT_REDIRECT') || error.message === 'NEXT_REDIRECT') {
      throw error; // Lempar kembali error redirect agar Next.js menanganinya
    }

    // Untuk error lain yang bukan sinyal redirect
    console.error("Unexpected error during dosen deletion:", error);
    return encodedRedirect(
      "error",
      "/pages-admin/data-management/dosen",
      "An unexpected error occurred: " + (error.message || "Unknown error")
    );
  }
};

// Action for a logged-in Dosen user to change THEIR OWN password
export async function changeDosenPasswordAction(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser(); // Get the currently logged-in user

    // Ensure user is authenticated and is a dosen (optional but good practice)
    // You might check user metadata role here if you store it there
    // const userRole = user?.user_metadata?.role;
    if (!user) { // || userRole !== 'dosen') { // Uncomment role check if needed
        console.error("Change dosen password failed: User not authenticated or not a dosen.");
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
    // This updates the password for the CURRENTLY LOGGED-IN user
    const { error } = await supabase.auth.updateUser({
        password: new_password,
    });

    if (error) {
        console.error("Error changing dosen password:", error);
        // Supabase might return errors for weak passwords etc.
        return { type: 'error', message: `Gagal mengganti password: ${error.message}` };
    }

    console.log("Dosen password changed successfully for user:", user.id);

    // Revalidate paths that might display user info or require auth
    revalidatePath('/pages-dosen'); // Revalidate dashboard page
    revalidatePath('/pages-dosen/settings'); // Revalidate the settings page itself


    return { type: 'success', message: 'Password berhasil diganti!' };
}
