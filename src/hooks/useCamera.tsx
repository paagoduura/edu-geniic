import { useState, useCallback } from 'react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface CameraPhoto {
  base64String?: string;
  dataUrl?: string;
  webPath?: string;
  format: string;
}

export const useCamera = () => {
  const [isSupported, setIsSupported] = useState(Capacitor.isNativePlatform());
  const [isLoading, setIsLoading] = useState(false);
  const [photo, setPhoto] = useState<CameraPhoto | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const takePhoto = useCallback(async (): Promise<CameraPhoto | null> => {
    setIsLoading(true);
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        width: 500,
        height: 500,
      });

      const photoResult: CameraPhoto = {
        base64String: image.base64String,
        dataUrl: `data:image/${image.format};base64,${image.base64String}`,
        webPath: image.webPath,
        format: image.format,
      };

      setPhoto(photoResult);
      return photoResult;
    } catch (error: any) {
      if (error.message !== 'User cancelled photos app') {
        console.error('Error taking photo:', error);
        toast({
          title: 'Camera Error',
          description: 'Failed to take photo. Please try again.',
          variant: 'destructive',
        });
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const pickFromGallery = useCallback(async (): Promise<CameraPhoto | null> => {
    setIsLoading(true);
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        width: 500,
        height: 500,
      });

      const photoResult: CameraPhoto = {
        base64String: image.base64String,
        dataUrl: `data:image/${image.format};base64,${image.base64String}`,
        webPath: image.webPath,
        format: image.format,
      };

      setPhoto(photoResult);
      return photoResult;
    } catch (error: any) {
      if (error.message !== 'User cancelled photos app') {
        console.error('Error picking photo:', error);
        toast({
          title: 'Gallery Error',
          description: 'Failed to select photo. Please try again.',
          variant: 'destructive',
        });
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const choosePhoto = useCallback(async (): Promise<CameraPhoto | null> => {
    setIsLoading(true);
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt, // Let user choose between camera and gallery
        width: 500,
        height: 500,
        promptLabelHeader: 'Profile Photo',
        promptLabelPhoto: 'Choose from Gallery',
        promptLabelPicture: 'Take Photo',
      });

      const photoResult: CameraPhoto = {
        base64String: image.base64String,
        dataUrl: `data:image/${image.format};base64,${image.base64String}`,
        webPath: image.webPath,
        format: image.format,
      };

      setPhoto(photoResult);
      return photoResult;
    } catch (error: any) {
      if (error.message !== 'User cancelled photos app') {
        console.error('Error choosing photo:', error);
        toast({
          title: 'Photo Error',
          description: 'Failed to get photo. Please try again.',
          variant: 'destructive',
        });
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const uploadProfilePhoto = useCallback(async (photoData: CameraPhoto): Promise<string | null> => {
    if (!user || !photoData.base64String) return null;

    setIsLoading(true);
    try {
      // Convert base64 to blob
      const byteCharacters = atob(photoData.base64String);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: `image/${photoData.format}` });

      // Upload to Supabase Storage
      const fileName = `${user.id}/avatar.${photoData.format}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          upsert: true,
          contentType: `image/${photoData.format}`,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Photo Updated',
        description: 'Your profile photo has been updated successfully.',
      });

      return avatarUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload profile photo. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const clearPhoto = useCallback(() => {
    setPhoto(null);
  }, []);

  // Fallback for web - use file input
  const handleWebFileInput = useCallback(async (event: React.ChangeEvent<HTMLInputElement>): Promise<CameraPhoto | null> => {
    const file = event.target.files?.[0];
    if (!file) return null;

    setIsLoading(true);
    try {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          const format = file.type.split('/')[1] || 'jpeg';
          
          const photoResult: CameraPhoto = {
            base64String: base64,
            dataUrl: reader.result as string,
            format,
          };

          setPhoto(photoResult);
          setIsLoading(false);
          resolve(photoResult);
        };
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('Error reading file:', error);
      setIsLoading(false);
      return null;
    }
  }, []);

  return {
    isSupported,
    isLoading,
    photo,
    takePhoto,
    pickFromGallery,
    choosePhoto,
    uploadProfilePhoto,
    clearPhoto,
    handleWebFileInput,
  };
};
