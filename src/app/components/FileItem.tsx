// app/components/FileItem.tsx
import { FileIcon, ImageIcon, LinkIcon, DownloadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';
import { toast } from 'sonner';

interface FileItemProps {
  file: any; // Replace with specific type later
  onShareToggle: (fileId: string) => void;
  currentFolderId: string | null;
}

export default function FileItem({ file, onShareToggle, currentFolderId }: FileItemProps) {
  const [isSharing, setIsSharing] = useState(false);

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'gif') {
      return <ImageIcon className="mr-2 h-4 w-4" />;
    }
    return <FileIcon className="mr-2 h-4 w-4" />;
  };

  const handleDownload = (messageId: number, filename: string) => {
    const downloadUrl = file.isChunked ? `/api/download-combined/${file.uploadSessionId}` : `/api/download/${messageId}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = async (token: string) => {
    if (!token) {
      toast.error('No public link available.');
      return;
    }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/api/public/${token}`);
      toast.success('Public link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy link: ', err);
      toast.error('Failed to copy link.');
    }
  };

  const handleShareToggle = async () => {
    setIsSharing(true);
    try {
      const response = await fetch(`/api/share/${file._id}`, {
        method: 'PUT',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle share status');
      }
      const result = await response.json();
      onShareToggle(file._id); // Notify parent to refetch file list
      toast.success(result.file.isPublic ? 'File shared publicly!' : 'File unshared.');
    } catch (error: any) {
      console.error('Share Toggle Error:', error);
      toast.error(error.message || 'An error occurred while toggling share status');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800">
      <div className="flex items-center space-x-2">
        {getFileIcon(file.originalFilename)}
        <span className="text-sm truncate max-w-xs">{file.originalFilename}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {Math.round(file.originalFileSize / (1024 * 1024))} MB
        </span>
      </div>
      <div className="flex items-center space-x-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => handleDownload(file.telegramMessageId, file.originalFilename)}>
                <DownloadIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Download</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleShareToggle} disabled={isSharing}>
                <LinkIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{file.isPublic ? 'Unshare' : 'Share'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {file.isPublic && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => handleCopyLink(file.publicShareToken)}>
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy Link</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}