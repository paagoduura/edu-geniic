import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Fingerprint, Scan, ShieldCheck, Smartphone, Loader2 } from 'lucide-react';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { BiometryType } from '@aparajita/capacitor-biometric-auth';

export const BiometricSettings = () => {
  const {
    isSupported,
    isAvailable,
    isEnabled,
    isLoading,
    biometryType,
    reason,
    getBiometryName,
    toggleBiometric,
  } = useBiometricAuth();

  const getBiometryIcon = () => {
    switch (biometryType) {
      case BiometryType.touchId:
      case BiometryType.fingerprintAuthentication:
        return <Fingerprint className="h-5 w-5 text-primary" />;
      case BiometryType.faceId:
      case BiometryType.faceAuthentication:
        return <Scan className="h-5 w-5 text-primary" />;
      default:
        return <ShieldCheck className="h-5 w-5 text-primary" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getBiometryIcon()}
          Biometric Security
        </CardTitle>
        <CardDescription>
          Use {getBiometryName()} for quick and secure access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isSupported && (
          <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                📱 Biometric authentication is available on the mobile app
              </p>
            </div>
          </div>
        )}

        {isSupported && !isAvailable && (
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Not Available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {reason || 'Biometric authentication is not set up on this device. Please configure it in your device settings.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {isSupported && isAvailable && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {getBiometryIcon()}
                </div>
                <div>
                  <Label htmlFor="biometric-toggle" className="font-medium">
                    {getBiometryName()} Login
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Quick access with biometric verification
                  </p>
                </div>
              </div>
              <Switch
                id="biometric-toggle"
                checked={isEnabled}
                onCheckedChange={toggleBiometric}
              />
            </div>

            {isEnabled && (
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">
                      Biometric Security Active
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You'll be prompted for {getBiometryName()} when opening the app
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
