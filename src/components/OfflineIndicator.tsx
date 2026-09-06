import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useOffline } from '@/hooks/useOffline';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export const OfflineIndicator = () => {
  const { isOnline, pendingSyncCount, cacheStats, syncNow, downloadForOffline, isSyncing, isDownloading } = useOffline();
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
    } else {
      const timer = setTimeout(() => setShowBanner(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const handleDownload = async () => {
    if (user?.id) {
      await downloadForOffline(user.id);
    }
  };

  return (
    <>
      {/* Offline Banner */}
      {showBanner && !isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-destructive text-destructive-foreground py-2 px-4 text-center z-50 animate-in slide-in-from-top">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">You're offline. Your progress will sync when you're back online.</span>
          </div>
        </div>
      )}

      {/* Status Indicator */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'relative gap-2',
              !isOnline && 'text-destructive'
            )}
          >
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            {pendingSyncCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingSyncCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Cloud className="w-5 h-5 text-green-500" />
                ) : (
                  <CloudOff className="w-5 h-5 text-destructive" />
                )}
                <span className="font-semibold">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              {isOnline && pendingSyncCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncNow}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-1" />
                  )}
                  Sync Now
                </Button>
              )}
            </div>

            {pendingSyncCount > 0 && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">Pending Sync</p>
                <p className="text-xs text-muted-foreground">
                  {pendingSyncCount} item(s) waiting to sync
                </p>
              </div>
            )}

            {cacheStats && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Offline Cache</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-secondary/50 p-2 rounded">
                    <p className="text-muted-foreground text-xs">Lessons</p>
                    <p className="font-semibold">{cacheStats.lessonCount}</p>
                  </div>
                  <div className="bg-secondary/50 p-2 rounded">
                    <p className="text-muted-foreground text-xs">Quizzes</p>
                    <p className="font-semibold">{cacheStats.quizCount}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Storage used</span>
                  <span>{cacheStats.totalSize}</span>
                </div>
              </div>
            )}

            {isOnline && (
              <Button
                className="w-full"
                onClick={handleDownload}
                disabled={isDownloading || !user}
              >
                {isDownloading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download for Offline
                  </>
                )}
              </Button>
            )}

            {!isOnline && cacheStats && cacheStats.lessonCount > 0 && (
              <div className="bg-green-500/10 text-green-600 dark:text-green-400 p-3 rounded-lg flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span className="text-sm">Offline content available</span>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};

export default OfflineIndicator;
