'use client'

import { useState } from 'react'
import { DataPanel } from '@/components/data-panel'
import { ChatPanel } from '@/components/chat-panel'

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  data: any[]
  uploadedAt: Date
}

export default function Home() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null)

  return (
    <div className="h-screen flex bg-background">
      <div className="w-1/3 border-r border-border">
        <DataPanel
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
        />
      </div>
      
      <div className="flex-1">
        <ChatPanel selectedFile={selectedFile} />
      </div>
    </div>
  )
}
