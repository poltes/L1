'use client'

import { useState } from 'react'
import { DataPanel } from '@/components/data-panel'
import { ChatPanel } from '@/components/chat-panel'
import { SPSSDataView } from '@/components/spss-data-view'

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
  const [showDataView, setShowDataView] = useState<UploadedFile | null>(null)

  const handleDataViewSave = (updatedData: any[], variables: any) => {
    if (showDataView) {
      const updatedFile = { ...showDataView, data: updatedData }
      setUploadedFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f))
      if (selectedFile?.id === updatedFile.id) {
        setSelectedFile(updatedFile)
      }
      setShowDataView(null)
    }
  }

  // Show SPSS Data View in full screen
  if (showDataView) {
    return (
      <div className="h-screen w-screen bg-background">
        <SPSSDataView
          file={showDataView}
          onClose={() => setShowDataView(null)}
          onSave={handleDataViewSave}
        />
      </div>
    )
  }

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
          onShowDataView={setShowDataView}
        />
      </div>
      
      <div className="flex-1">
        <ChatPanel selectedFile={selectedFile} />
      </div>
    </div>
  )
}
