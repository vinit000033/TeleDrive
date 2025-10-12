// app/components/Sidebar.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderIcon, PlusIcon, UploadIcon } from 'lucide-react';
import FolderItem from './FolderItem';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface SidebarProps {
  currentFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onUploadFile: () => void;
}

export default function Sidebar({ currentFolderId, onFolderSelect, onCreateFolder, onUploadFile }: SidebarProps) {
  const [folders, setFolders] = useState<any[]>([]);
  const [showNewOptions, setShowNewOptions] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const parentId = currentFolderId || 'root';
        const response = await fetch(`/api/folders?parentId=${parentId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch folders');
        }
        const data = await response.json();
        setFolders(data.folders);
      } catch (error: any) {
        console.error('Fetch Folders Error:', error);
        toast.error(error.message || 'Failed to load folders');
      }
    };

    fetchFolders();
  }, [currentFolderId]); // Only re-run when currentFolderId changes

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name cannot be empty.');
      return;
    }

    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName, parentId: currentFolderId || 'root' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create folder');
      }

      const result = await response.json();
      toast.success(`Folder "${newFolderName}" created successfully!`);
      setNewFolderName('');
      setShowNewOptions(false);
      // Refresh folders in the current view
      const parentId = currentFolderId || 'root';
      const responseRefresh = await fetch(`/api/folders?parentId=${parentId}`);
      if (responseRefresh.ok) {
        const dataRefresh = await responseRefresh.json();
        setFolders(dataRefresh.folders);
      }
    } catch (error: any) {
      console.error('Create Folder Error:', error);
      toast.error(error.message || 'An error occurred while creating the folder');
    }
  };

  const handleFolderClick = (folderId: string) => {
    onFolderSelect(folderId);
  };

  const handleUploadClick = () => {
    onUploadFile();
    setShowNewOptions(false);
  };

  return (
    <Card className="w-64 h-full flex flex-col"> {/* Use default shadcn Card classes */}
      <CardHeader>
        <CardTitle className="text-lg">Folders</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-auto">
        <div className="space-y-1">
          <div
            className={`flex items-center p-2 rounded cursor-pointer hover:bg-accent ${currentFolderId === null ? 'bg-accent' : ''}`} // Use shadcn's bg-accent
            onClick={() => onFolderSelect(null)}
          >
            <FolderIcon className="h-4 w-4 mr-2" />
            <span>Root</span>
          </div>
          {folders.map((folder) => (
            <FolderItem
              key={folder._id}
              folder={folder}
              onClick={() => handleFolderClick(folder._id)}
              onCreateFolder={onCreateFolder}
              currentFolderId={currentFolderId}
            />
          ))}
        </div>
      </CardContent>
      <div className="p-4 border-t"> {/* Use default border-t */}
        <Button variant="outline" size="sm" className="w-full" onClick={() => setShowNewOptions(!showNewOptions)}>
          <PlusIcon className="h-4 w-4 mr-1" />
          New
        </Button>
        {showNewOptions && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="text-xs h-8"
              />
              <Button variant="outline" size="sm" onClick={handleCreateFolder} className="h-8">
                Create
              </Button>
            </div>
            <Button variant="outline" size="sm" className="w-full h-8" onClick={handleUploadClick}>
              <UploadIcon className="h-4 w-4 mr-1" />
              Upload File
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}