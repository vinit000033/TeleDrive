// app/components/FolderItem.tsx
import { FolderIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FolderItemProps {
  folder: any; // Replace with specific type later
  onClick: () => void; // This prop is called when the folder item is clicked
  onCreateFolder: (parentId: string) => void;
  currentFolderId: string | null;
}

export default function FolderItem({ folder, onClick, onCreateFolder, currentFolderId }: FolderItemProps) {
  const isCurrent = currentFolderId === folder._id;

  const handleCreateFolder = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent folder click when creating folder
    onCreateFolder(folder._id);
  };

  return (
    <div className="ml-4">
      <div
        className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-700 ${isCurrent ? 'bg-gray-700' : ''}`} // Apply hover and selection styles
        onClick={onClick} // This is the key line that triggers navigation
      >
        <div className="flex items-center space-x-2">
          <FolderIcon className="h-4 w-4" />
          <span className="text-sm truncate max-w-[140px]">{folder.name}</span>
        </div>
        {/* Optional: Add create folder button inside folder item */}
        {/* <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleCreateFolder}>
                <PlusIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create Folder</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider> */}
      </div>
    </div>
  );
}