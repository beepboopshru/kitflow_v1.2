import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { Download, Trash2, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type FileType = "mdf_dxf" | "acrylic_dxf" | "printable_pdf";

interface FileManagementModalProps {
  kitId: Id<"kits">;
  kitName: string;
  fileType: FileType;
  isOpen: boolean;
  onClose: () => void;
}

function FileManagementModal({ kitId, kitName, fileType, isOpen, onClose }: FileManagementModalProps) {
  const files = useQuery(api.laserFiles.getByKitAndType, { kitId, fileType });
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const createFile = useMutation(api.laserFiles.create);
  const removeFile = useMutation(api.laserFiles.remove);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<Id<"laserFiles"> | null>(null);

  const fileTypeLabels: Record<FileType, string> = {
    mdf_dxf: "MDF Files (DXF)",
    acrylic_dxf: "Acrylic Files (DXF)",
    printable_pdf: "Printable Designs (PDF)"
  };

  const acceptedFileTypes: Record<FileType, string> = {
    mdf_dxf: ".dxf",
    acrylic_dxf: ".dxf",
    printable_pdf: ".pdf"
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Validate file type
        const extension = file.name.split('.').pop()?.toLowerCase();
        const expectedExtension = fileType.includes("pdf") ? "pdf" : "dxf";
        if (extension !== expectedExtension) {
          toast.error(`Invalid file type for ${file.name}. Expected .${expectedExtension}`);
          continue;
        }

        // Get upload URL
        const uploadUrl = await generateUploadUrl();
        
        // Upload file
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        
        const { storageId } = await result.json();
        
        // Save file metadata
        await createFile({
          kitId,
          fileType,
          fileName: file.name,
          storageId,
        });
      }
      
      toast.success(`${selectedFiles.length} file(s) uploaded successfully`);
      e.target.value = ""; // Reset input
    } catch (error) {
      toast.error("Failed to upload files");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: Id<"laserFiles">) => {
    try {
      await removeFile({ id: fileId });
      toast.success("File deleted successfully");
      setDeleteId(null);
    } catch (error) {
      toast.error("Failed to delete file");
      console.error(error);
    }
  };

  const handleDownload = async (storageId: string, fileName: string) => {
    try {
      const url = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/storage/${storageId}`).then(r => r.url);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      toast.error("Failed to download file");
      console.error(error);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Managing {fileTypeLabels[fileType]} for '{kitName}'</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <input
                type="file"
                id={`upload-${fileType}`}
                multiple
                accept={acceptedFileTypes[fileType]}
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
              <label htmlFor={`upload-${fileType}`}>
                <Button asChild disabled={uploading}>
                  <span className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload New Files"}
                  </span>
                </Button>
              </label>
            </div>

            {files === undefined ? (
              <div className="text-center py-8 text-muted-foreground">Loading files...</div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No files uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file._id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm font-medium truncate flex-1">{file.fileName}</span>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(file.storageId, file.fileName)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(file._id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function LaserFiles() {
  const kits = useQuery(api.kits.list);
  const [modalState, setModalState] = useState<{
    kitId: Id<"kits">;
    kitName: string;
    fileType: FileType;
  } | null>(null);

  const getFileCount = (kitId: Id<"kits">, fileType: FileType) => {
    const files = useQuery(api.laserFiles.getByKitAndType, { kitId, fileType });
    return files?.length ?? 0;
  };

  const FileCell = ({ kitId, kitName, fileType }: { kitId: Id<"kits">; kitName: string; fileType: FileType }) => {
    const fileCount = getFileCount(kitId, fileType);

    if (fileCount === 0) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setModalState({ kitId, kitName, fileType })}
        >
          Add Files
        </Button>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{fileCount} File{fileCount !== 1 ? 's' : ''}</Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setModalState({ kitId, kitName, fileType })}
        >
          Manage
        </Button>
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laser Files</h1>
          <p className="text-muted-foreground mt-2">
            Manage manufacturing design files (DXF and PDF) for all kits
          </p>
        </div>

        {kits === undefined ? (
          <div className="text-center py-12">Loading kits...</div>
        ) : kits.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No kits found. Create kits first to manage their laser files.
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kit Name</TableHead>
                  <TableHead>MDF Files (DXF)</TableHead>
                  <TableHead>Acrylic Files (DXF)</TableHead>
                  <TableHead>Printable Designs (PDF)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kits.map((kit) => (
                  <TableRow key={kit._id}>
                    <TableCell className="font-medium">{kit.name}</TableCell>
                    <TableCell>
                      <FileCell kitId={kit._id} kitName={kit.name} fileType="mdf_dxf" />
                    </TableCell>
                    <TableCell>
                      <FileCell kitId={kit._id} kitName={kit.name} fileType="acrylic_dxf" />
                    </TableCell>
                    <TableCell>
                      <FileCell kitId={kit._id} kitName={kit.name} fileType="printable_pdf" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {modalState && (
        <FileManagementModal
          kitId={modalState.kitId}
          kitName={modalState.kitName}
          fileType={modalState.fileType}
          isOpen={true}
          onClose={() => setModalState(null)}
        />
      )}
    </Layout>
  );
}
