import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Camera, Upload, Loader2, X } from 'lucide-react';
import { useCamera, CameraPhoto } from '@/hooks/useCamera';
import { Capacitor } from '@capacitor/core';

interface ProfilePhotoUploadProps {
  currentAvatarUrl?: string | null;
  userName?: string;
  onPhotoUploaded?: (url: string) => void;
}

export const ProfilePhotoUpload = ({
  currentAvatarUrl,
  userName = 'User',
  onPhotoUploaded,
}: ProfilePhotoUploadProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<CameraPhoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    isSupported: isCameraSupported,
    isLoading,
    choosePhoto,
    uploadProfilePhoto,
    handleWebFileInput,
    clearPhoto,
  } = useCamera();

  const handleNativeCapture = async () => {
    const photo = await choosePhoto();
    if (photo) {
      setPreviewPhoto(photo);
    }
  };

  const handleWebCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const photo = await handleWebFileInput(event);
    if (photo) {
      setPreviewPhoto(photo);
    }
  };

  const handleUpload = async () => {
    if (!previewPhoto) return;

    const url = await uploadProfilePhoto(previewPhoto);
    if (url) {
      onPhotoUploaded?.(url);
      setPreviewPhoto(null);
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setPreviewPhoto(null);
    clearPhoto();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="relative group cursor-pointer">
          <Avatar className="w-20 h-20 border-4 border-primary/20">
            <AvatarImage src={currentAvatarUrl || undefined} alt={userName} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </div>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Profile Photo</DialogTitle>
          <DialogDescription>
            {isCameraSupported
              ? 'Take a new photo or choose from your gallery'
              : 'Upload a photo from your device'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Preview */}
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-primary/20">
              <AvatarImage
                src={previewPhoto?.dataUrl || currentAvatarUrl || undefined}
                alt={userName}
              />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-4xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {previewPhoto && (
              <Button
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                onClick={handleCancel}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Actions */}
          {!previewPhoto ? (
            <div className="flex flex-col gap-3 w-full">
              {isCameraSupported ? (
                <Button
                  onClick={handleNativeCapture}
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5 mr-2" />
                  )}
                  Take Photo or Choose from Gallery
                </Button>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handleWebCapture}
                    className="hidden"
                    id="photo-upload"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5 mr-2" />
                    )}
                    Upload Photo
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5 mr-2" />
                )}
                Save Photo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
