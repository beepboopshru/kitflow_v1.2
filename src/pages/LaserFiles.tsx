import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation, useAction } from "convex/react";
import { useState } from "react";
import { Download, Trash2, Upload, FileText, ArrowLeft, Box } from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";

type ProgramType = string | null;

interface FileManagementModalProps {
  kitId: Id<"kits">;
  kitName: string;
  isOpen: boolean;
  onClose: () => void;
}

function FileManagementModal({ kitId, kitName, isOpen, onClose }: FileManagementModalProps) {
  const files = useQuery(api.laserFiles.getByKit, { kitId });
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const createFile = useMutation(api.laserFiles.create);
  const removeFile = useMutation(api.laserFiles.remove);
  const getFileUrl = useAction(api.storage.getFileUrl);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<Id<"laserFiles"> | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Validate file type (DXF, PDF, and CDR allowed)
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension !== "dxf" && extension !== "pdf" && extension !== "cdr") {
          toast.error(`Invalid file type for ${file.name}. Only .dxf, .pdf, and .cdr files are allowed`);
          continue;
        }

        // Get upload URL
        const uploadUrl = await generateUploadUrl();
        
        // Upload file with proper content type
        const contentType = file.type || "application/octet-stream";
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": contentType },
          body: file,
        });
        
        // Check if upload was successful
        if (!result.ok) {
          toast.error(`Failed to upload ${file.name}: ${result.statusText}`);
          console.error("Upload failed:", result.status, result.statusText);
          continue;
        }
        
        // Parse response and get storageId
        const responseData = await result.json();
        const storageId = responseData.storageId;
        
        if (!storageId) {
          toast.error(`Failed to get storage ID for ${file.name}`);
          console.error("No storageId in response:", responseData);
          continue;
        }
        
        // Save file metadata
        await createFile({
          kitId,
          fileName: file.name,
          storageId,
        });
      }
      
      toast.success(`${selectedFiles.length} file(s) uploaded successfully`);
      e.target.value = ""; // Reset input
    } catch (error) {
      toast.error("Failed to upload files");
      console.error("Upload error:", error);
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
      const url = await getFileUrl({ storageId });
      if (!url) {
        toast.error("File URL is unavailable or expired");
        return;
      }
      
      // Fetch the file as a blob to ensure proper download with filename
      const response = await fetch(url);
      if (!response.ok) {
        toast.error("Failed to fetch file");
        return;
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
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
            <DialogTitle>Managing Files for '{kitName}'</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <input
                type="file"
                id={`upload-files`}
                multiple
                accept=".dxf,.pdf,.cdr"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
              <label htmlFor={`upload-files`}>
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
  const programs = useQuery(api.programs.list);
  const allLaserFiles = useQuery(api.laserFiles.list, {});
  const [selectedProgram, setSelectedProgram] = useState<ProgramType>(null);
  const [modalState, setModalState] = useState<{
    kitId: Id<"kits">;
    kitName: string;
  } | null>(null);

  const getFileCount = (kitId: Id<"kits">) => {
    const files = useQuery(api.laserFiles.getByKit, { kitId });
    return files?.length ?? 0;
  };

  const FileCell = ({ kitId, kitName }: { kitId: Id<"kits">; kitName: string }) => {
    const fileCount = getFileCount(kitId);

    if (fileCount === 0) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setModalState({ kitId, kitName })}
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
          onClick={() => setModalState({ kitId, kitName })}
        >
          Manage
        </Button>
      </div>
    );
  };

  // Filter kits by selected program
  const filteredKits = selectedProgram 
    ? (kits ?? []).filter(k => k.type === selectedProgram)
    : [];

  // Calculate file stats for each program
  const getProgramFileStats = (programSlug: string) => {
    const programKits = (kits ?? []).filter(k => k.type === programSlug);
    let totalFiles = 0;
    
    if (allLaserFiles) {
      programKits.forEach(kit => {
        const kitFiles = allLaserFiles.filter(f => f.kitId === kit._id);
        totalFiles += kitFiles.length;
      });
    }
    
    return { totalKits: programKits.length, totalFiles };
  };

  // Landing View: Program Selection
  if (selectedProgram === null) {
    return (
      <Layout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Laser Files</h1>
            <p className="text-muted-foreground mt-2">
              Select a program to manage manufacturing design files
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(programs ?? []).map((program, index) => {
              const stats = getProgramFileStats(program.slug);
              return (
                <motion.div
                  key={program._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
                    onClick={() => setSelectedProgram(program.slug)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Box className="h-6 w-6" />
                        {program.name}
                      </CardTitle>
                      {program.description && (
                        <p className="text-xs text-muted-foreground">{program.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Kits</p>
                          <p className="text-2xl font-bold">{stats.totalKits}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Files</p>
                          <p className="text-2xl font-bold">{stats.totalFiles}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Layout>
    );
  }

  // Program View: Kit File Management
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedProgram(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Programs
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {(programs ?? []).find(p => p.slug === selectedProgram)?.name || selectedProgram.toUpperCase()} - Laser Files
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage manufacturing design files (DXF, PDF, and CDR) for {(programs ?? []).find(p => p.slug === selectedProgram)?.name || selectedProgram} kits
            </p>
          </div>
        </div>

        {filteredKits.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No kits found in this program.</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kit Name</TableHead>
                  <TableHead>Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKits.map((kit) => (
                  <TableRow key={kit._id}>
                    <TableCell className="font-medium">{kit.name}</TableCell>
                    <TableCell>
                      <FileCell kitId={kit._id} kitName={kit.name} />
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
          isOpen={true}
          onClose={() => setModalState(null)}
        />
      )}
    </Layout>
  );
}