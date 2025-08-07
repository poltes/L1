'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, FileText, Database, Trash2, Eye, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import { DataVisualizations } from '@/components/data-visualizations'

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  data: any[]
  uploadedAt: Date
}

interface DataPanelProps {
  uploadedFiles: UploadedFile[]
  setUploadedFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void
  selectedFile: UploadedFile | null
  setSelectedFile: (file: UploadedFile | null) => void
}

export function DataPanel({ uploadedFiles, setUploadedFiles, selectedFile, setSelectedFile }: DataPanelProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    processFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    processFiles(files)
  }

  const processFiles = async (files: File[]) => {
    for (const file of files) {
      if (!file.name.match(/\.(csv|json|xlsx|xls)$/i)) {
        toast.error(`Unsupported file type: ${file.name}`)
        continue
      }

      try {
        const data = await parseFile(file)
        const uploadedFile: UploadedFile = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          type: file.type || getFileTypeFromExtension(file.name),
          size: file.size,
          data,
          uploadedAt: new Date()
        }

        setUploadedFiles((prev: UploadedFile[]) => [...prev, uploadedFile])
        toast.success(`File ${file.name} uploaded successfully`)
      } catch (error) {
        toast.error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  const parseFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          
          if (file.name.endsWith('.json')) {
            const jsonData = JSON.parse(content)
            resolve(Array.isArray(jsonData) ? jsonData : [jsonData])
          } else if (file.name.endsWith('.csv')) {
            resolve(parseCSV(content))
          } else {
            reject(new Error('Unsupported file format'))
          }
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  const parseCSV = (content: string): any[] => {
    const lines = content.split('\n').filter(line => line.trim())
    if (lines.length === 0) return []
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const data: any[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      data.push(row)
    }
    
    return data
  }

  const getFileTypeFromExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'csv': return 'text/csv'
      case 'json': return 'application/json'
      case 'xlsx': case 'xls': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      default: return 'application/octet-stream'
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const deleteFile = (fileId: string) => {
    setUploadedFiles((prev: UploadedFile[]) => prev.filter(f => f.id !== fileId))
    if (selectedFile?.id === fileId) {
      setSelectedFile(null)
    }
    toast.success('File deleted')
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold mb-4">Data Analysis Hub</h2>
        
        <div
          className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop files here, or
            </p>
            <Button 
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
            >
              Browse Files
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Supports CSV, JSON, Excel files
            </p>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.json,.xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="files" className="h-full flex flex-col">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="files" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Files ({uploadedFiles.length})
              </TabsTrigger>
              <TabsTrigger value="visualizations" className="flex items-center gap-2" disabled={!selectedFile}>
                <BarChart3 className="h-4 w-4" />
                Charts
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="files" className="flex-1 overflow-hidden">
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-2">
                {uploadedFiles.map((file) => (
                  <Card 
                    key={file.id}
                    className={`cursor-pointer transition-colors ${
                      selectedFile?.id === file.id ? 'bg-primary/5 border-primary' : ''
                    }`}
                    onClick={() => setSelectedFile(file)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium truncate">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {file.data.length} rows
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {file.uploadedAt.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedFile(file)
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteFile(file.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {uploadedFiles.length === 0 && (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No files uploaded yet</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="visualizations" className="flex-1 overflow-hidden">
            <ScrollArea className="flex-1 px-6">
              {selectedFile ? (
                <DataVisualizations data={selectedFile.data} fileName={selectedFile.name} />
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Select a file to view visualizations</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}