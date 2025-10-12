// app/home/page.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// ... other imports ...
import { FolderIcon, FileIcon, ImageIcon, DownloadIcon, Copy,LinkIcon, UploadIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const CHUNK_SIZE = 1073741824; // 1GB in bytes
// const CHUNK_SIZE = 1048576; // 1MB in bytes

export default function HomePage() {
  const [files, setFiles] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string>('Root');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wrap fetch functions in useCallback
  const fetchFiles = useCallback(async (folderId: string | null) => {
    try {
      const url = `/api/files${folderId ? `?folderId=${folderId}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      const data = await response.json();
      setFiles(data.files);
    } catch (error: any) {
      console.error('Fetch Files Error:', error);
      toast.error(error.message || 'Failed to load files');
    }
  }, []); // Empty dependency array

  const fetchFolders = useCallback(async (parentId: string | null) => {
    try {
      const url = `/api/folders${parentId ? `?parentId=${parentId}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }
      const data = await response.json();
      setFolders(data.folders);
    } catch (error: any) {
      console.error('Fetch Folders Error:', error);
      toast.error(error.message || 'Failed to load folders');
    }
  }, []); // Empty dependency array

  // Update main useEffect
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await fetchFiles(currentFolderId);
        await fetchFolders(currentFolderId);
        if (currentFolderId) {
          const currentFolder = folders.find(f => f._id === currentFolderId);
          if (currentFolder) {
             setCurrentFolderName(currentFolder.name);
          } else {
             setCurrentFolderName('Loading...');
          }
        } else {
          setCurrentFolderName('Root');
        }
      } catch (error: any) {
        console.error('Fetch Data Error:', error);
        toast.error(error.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentFolderId, fetchFiles, fetchFolders]); // Add fetchFiles and fetchFolders, NOT folders

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const splitFileAndUpload = async (file: File, parentFolderId: string | null) => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadSessionId = Date.now().toString() + Math.random().toString(36).substring(2);
    let uploadedChunks = 0;

    setIsUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('originalFilename', file.name);
      formData.append('uploadSessionId', uploadSessionId);
      formData.append('chunkIndex', i.toString());
      formData.append('totalChunks', totalChunks.toString());
      formData.append('parentFolderId', parentFolderId || 'root');

      try {
        const response = await fetch('/api/upload-chunk', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Chunk upload failed');
        }

        uploadedChunks++;
        const progress = Math.round((uploadedChunks / totalChunks) * 100);
        setUploadProgress(progress);
        console.log(`Chunk ${i + 1}/${totalChunks} uploaded. Progress: ${progress}%`);
      } catch (error: any) {
        console.error(`Error uploading chunk ${i}:`, error);
        toast.error(`Error uploading chunk ${i + 1}: ${error.message}`);
        setUploadProgress(null);
        setIsUploading(false);
        return;
      }
    }

    toast.success(`File "${file.name}" uploaded successfully in ${totalChunks} chunks!`);
    setUploadProgress(null);
    setIsUploading(false);
    fetchFiles(currentFolderId); // Refresh current folder's files
  };

  // Move upload logic to a separate function
  const performUpload = async (filesToUpload: FileList) => {
     for (const file of Array.from(filesToUpload)) {
     if (file.size > 1.5 * 1024 * 1024 * 1024){
        console.log("File is large, using chunking logic.", file.name);
        await splitFileAndUpload(file, currentFolderId);
      } else {
        console.log("File is small, using direct upload logic.", file.name);
        try {
          setLoading(true);
          const formData = new FormData();
          formData.append('file', file);
          formData.append('parentFolderId', currentFolderId || 'root');

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Upload failed');
          }

          const result = await response.json();
          toast.success(`File "${file.name}" uploaded successfully!`);
          console.log('Upload Result:', result);
        } catch (error: any) {
          console.error('Upload Error:', error);
          toast.error(`Upload failed for ${file.name}: ${error.message}`);
        }
      }
    }
    fetchFiles(currentFolderId); // Refresh current folder's files after all uploads
    if (fileInputRef.current) fileInputRef.current.value = ''; // Clear input
    setLoading(false);
  };

  // Handle file selection via hidden input
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
        performUpload(files).catch(error => {
            console.error("Error in file input change handler:", error);
            toast.error("An error occurred during upload.");
        });
    }
  };

  const handleFolderSelect = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  const handleCreateFolder = (parentId: string | null) => {
    fetchFolders(currentFolderId);
  };

  const handleUploadFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
const handleDownload = (messageId: number | undefined, filename: string, isChunked: boolean, sessionId?: string) => {
    let downloadUrl;
    if (isChunked && sessionId) {
      // Use the combined download route for chunked files
      downloadUrl = `/api/download-combined/${sessionId}`;
    } else if (!isChunked && messageId) {
      // Use the single file download route
      downloadUrl = `/api/download/${messageId}`;
    } else {
      console.error("Cannot determine download URL for file:", { messageId, isChunked, sessionId });
      toast.error("Download URL could not be determined.");
      return;
    }

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareToggle = async (fileId: string) => {
    try {
      const response = await fetch(`/api/share/${fileId}`, {
        method: 'PUT',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle share status');
      }
      const result = await response.json();
      fetchFiles(currentFolderId);
      toast.success(result.file.isPublic ? 'File shared publicly!' : 'File unshared.');
    } catch (error: any) {
      console.error('Share Toggle Error:', error);
      toast.error(error.message || 'An error occurred while toggling share status');
    }
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

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'gif' || ext === 'webp') {
      return <ImageIcon className="h-10 w-10 text-blue-400" />;
    }
    return <FileIcon className="h-10 w-10 text-gray-400" />;
  };

  return (
    <div className="flex py-6 h-screen"> {/* Use default shadcn dark mode background */}
      <Sidebar
        currentFolderId={currentFolderId}
        onFolderSelect={handleFolderSelect}
        onCreateFolder={handleCreateFolder}
        onUploadFile={handleUploadFileClick}
      />
      <div className="flex-1 px-6 overflow-auto">
        <Card className="h-full flex flex-col"> {/* Use default shadcn Card classes */}
          <CardHeader className="border-b">
            <CardTitle className="text-xl">
              {currentFolderName}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 overflow-auto">
            {/* Hidden file input - handle upload via onChange */}
            <Input
              id="file-upload"
              type="file"
              ref={fileInputRef}
              multiple
              onChange={handleFileInputChange} // Add the onChange handler here
              className="hidden"
            />

            {isUploading && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${uploadProgress || 0}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{uploadProgress}%</p>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Folders</h3>
              {folders.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No folders in this location.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {folders.map(folder => (
                    <div
                      key={folder._id}
                      className="flex flex-col items-center p-4 border rounded-lg cursor-pointer hover:bg-accent" // Use shadcn's hover:bg-accent
                      onClick={() => handleFolderSelect(folder._id)}
                    >
                      <FolderIcon className="h-12 w-12 mb-2" />
                      <span className="text-sm truncate max-w-full text-center">{folder.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
<div>
              <h3 className="text-lg font-semibold mb-2">Files</h3>
              {files.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No files in this location.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {files.map((file) => (
                    <div key={file._id || file.uploadSessionId} className="border rounded-lg p-3 flex flex-col items-center bg-muted/50 hover:bg-muted">
                      <div className="mb-2">
                        {getFileIcon(file.originalFilename)}
                      </div>
                      <div className="text-xs text-center truncate max-w-full mb-1">{file.originalFilename}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{formatFileSize(file.originalFileSize)}</div>
                      <div className="flex space-x-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(file.telegramMessageId, file.originalFilename, file.isChunked, file.uploadSessionId)} // Pass chunked and sessionId
                                className="h-8 w-8 p-0"
                              >
                                <DownloadIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Download</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {/* Share and copy link logic remains the same, assuming isPublic/publicShareToken are stored in the first chunk */}
                         <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleShareToggle(file._id || file._idFromFirstChunk)} // Use file._id if available, otherwise a unique ID from the first chunk's doc (you might need to adjust this)
                                className="h-8 w-8 p-0"
                              >
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCopyLink(file.publicShareToken)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Copy className="h-4 w-4" />
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
                  ))}
                </div>
              )}
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}