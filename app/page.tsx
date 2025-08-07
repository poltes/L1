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
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)

  return (
    <div className="h-screen flex bg-background">
      <div className={`transition-all duration-300 border-r border-border ${
        isPanelCollapsed ? 'w-12' : 'w-1/4'
      }`}>
        <DataPanel
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          isCollapsed={isPanelCollapsed}
          onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
        />
      </div>
      
      <div className="flex-1">
        <ChatPanel selectedFile={selectedFile} />
      </div>
    </div>
  )
}
