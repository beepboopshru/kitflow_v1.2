import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface KitImageViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kitName: string;
  storageId: string;
}

export function KitImageViewer({ open, onOpenChange, kitName, storageId }: KitImageViewerProps) {
  const imageUrl = useQuery(api.storage.getImageUrl, { storageId });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{kitName} - Image</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center p-4">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={kitName}
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          ) : (
            <p className="text-muted-foreground">Loading image...</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
