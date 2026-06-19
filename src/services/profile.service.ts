/**
 * Bugsok AI — Profile Service
 *
 * Wraps all Supabase database and storage calls related to user profiles.
 * Handles fetching profile data, updating profile fields, and uploading avatars.
 */

import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import type { UserProfile, UpdateProfileData } from '../types';

/**
 * Fetch the full profile row for a given user ID.
 * @returns The profile data, or null if not found.
 */
export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Failed to fetch profile:', error.message);
      return null;
    }

    return data as UserProfile;
  } catch (err) {
    console.error('fetchUserProfile unexpected error:', err);
    return null;
  }
};

/**
 * Update specific fields on a user's profile row.
 * Only the fields present in `updates` will be modified.
 * @returns An error message, or null on success.
 */
export const updateUserProfile = async (
  userId: string,
  updates: UpdateProfileData
): Promise<string | null> => {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) {
    console.warn('Profile update failed:', error.message);
    return error.message;
  }

  return null;
};

/**
 * Upload a profile avatar image to Supabase Storage.
 * Handles both native (React Native FormData) and web (Blob) uploads.
 *
 * @param userId - The user's UUID (used as the storage folder).
 * @param imageUri - The local URI of the selected image.
 * @returns The public URL of the uploaded avatar, or null if upload failed.
 */
export const uploadAvatar = async (
  userId: string,
  imageUri: string
): Promise<string | null> => {
  try {
    const fileExt = imageUri.split('.').pop() || 'jpg';
    const fileName = `${userId}/avatar.${fileExt}`;

    let fileBody: any;
    let uploadOptions: any = { upsert: true };

    if (Platform.OS === 'web') {
      // Web: Convert URI to Blob
      const response = await fetch(imageUri);
      fileBody = await response.blob();
      uploadOptions.contentType = `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;
    } else {
      // Native: Use FormData for React Native's native network engine
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        name: `avatar.${fileExt}`,
        type: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
      } as any);
      fileBody = formData;
      // Omit contentType for FormData — lets the native engine set the boundary
    }

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, fileBody, uploadOptions);

    if (uploadError) {
      console.warn('Avatar upload failed:', uploadError.message);
      return null;
    }

    // Generate and return the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (err: any) {
    console.warn('uploadAvatar unexpected error:', err.message);
    return null;
  }
};
