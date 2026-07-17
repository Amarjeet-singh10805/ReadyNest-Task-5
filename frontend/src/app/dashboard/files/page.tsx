'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Search, Trash2, Download, FileText, Image, File as FileIcon } from 'lucide-react';
import { useFiles, useUploadFile, useDeleteFile } from '@/hooks/useApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDate, formatFileSize, getFileIcon } from '@/lib/utils';
import type { FileRecord } from '@/types';

export default function FilesPage() {
  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState(false);
  const { data, isLoading } = useFiles({ search: search || undefined });
  const { mutate: uploadFile, isPending: uploading } = useUploadFile();
  const { mutate: deleteFile } = useDeleteFile();

  const files: FileRecord[] = (data as any)?.data || [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile({ file });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile({ file });
  }, [uploadFile]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Files</h2>
          <p className="text-muted-foreground text-sm">{files.length} files stored</p>
        </div>
        <div>
          <input type="file" id="file-upload" className="hidden" onChange={handleFileSelect} />
          <Button onClick={() => document.getElementById('file-upload')?.click()} disabled={uploading}>
            <Upload className="w-4 h-4 mr-2" /> {uploading ? 'Uploading…' : 'Upload File'}
          </Button>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'
        )}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Drag & drop files here, or <span className="text-primary cursor-pointer" onClick={() => document.getElementById('file-upload')?.click()}>browse</span></p>
        <p className="text-xs text-muted-foreground mt-1">Max 50MB per file</p>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search files…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No files yet. Upload your first file!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => (
            <motion.div key={file.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="card-hover group">
                <CardContent className="p-4 space-y-3">
                  {/* Preview */}
                  {file.mimeType.startsWith('image/') ? (
                    <div className="aspect-video rounded-md overflow-hidden bg-muted">
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-video rounded-md bg-muted flex items-center justify-center text-4xl">
                      {getFileIcon(file.mimeType)}
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-xs font-medium truncate" title={file.originalName}>{file.originalName}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    {file.project && <p className="text-xs text-muted-foreground truncate">{file.project.name}</p>}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{formatDate(file.createdAt, 'MMM d')}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={file.url} target="_blank" rel="noopener noreferrer" download>
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => confirm('Delete file?') && deleteFile(file.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
