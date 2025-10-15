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

type FileType = "mdf_dxf" | "acrylic_dxf" | "printable_pdf";
type ProgramType = string | null;

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
  const getFileUrl = useAction(api.storage.getFileUrl);
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
      const url = await getFileUrl({ storageId });
      if (!url) {
        toast.error("File URL is unavailable or expired");
        return;
      }
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
  const programs = useQuery(api.programs.list);
  const allLaserFiles = useQuery(api.laserFiles.list, {});
  const [selectedProgram, setSelectedProgram] = useState<ProgramType>(null);
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
              Manage manufacturing design files (DXF and PDF) for {(programs ?? []).find(p => p.slug === selectedProgram)?.name || selectedProgram} kits
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
                  <TableHead>MDF Files (DXF)</TableHead>
                  <TableHead>Acrylic Files (DXF)</TableHead>
                  <TableHead>Printable Designs (PDF)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKits.map((kit) => (
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