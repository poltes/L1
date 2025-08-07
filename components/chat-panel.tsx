'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Send, Bot, User, FileText, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  data: any[]
  uploadedAt: Date
}

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  fileContext?: string
}

interface ChatPanelProps {
  selectedFile: UploadedFile | null
}

export function ChatPanel({ selectedFile }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (selectedFile) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `I can help you analyze the data from "${selectedFile.name}". This file contains ${selectedFile.data.length} rows of data. You can ask me questions like:

• "What are the main trends in this data?"
• "Can you summarize the key statistics?"
• "Show me a breakdown by category"
• "What insights can you find?"

What would you like to know about your data?`,
        timestamp: new Date(),
        fileContext: selectedFile.name
      }
      setMessages([welcomeMessage])
    }
  }, [selectedFile])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    if (!selectedFile) {
      toast.error('Please select a file to analyze first')
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
      fileContext: selectedFile.name
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          fileData: selectedFile.data,
          fileName: selectedFile.name
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response,
        timestamp: new Date(),
        fileContext: selectedFile.name
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      toast.error('Failed to send message. Please try again.')
      console.error('Chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getDataPreview = () => {
    if (!selectedFile || selectedFile.data.length === 0) return null

    const sampleData = selectedFile.data.slice(0, 3)
    const columns = Object.keys(sampleData[0] || {})

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Data Preview: {selectedFile.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs text-muted-foreground mb-2">
            {selectedFile.data.length} rows × {columns.length} columns
          </div>
          <div className="border rounded-md p-2 bg-muted/50">
            <div className="grid gap-1 text-xs">
              <div className="font-mono">
                <strong>Columns:</strong> {columns.join(', ')}
              </div>
              <div className="font-mono">
                <strong>Sample:</strong> {JSON.stringify(sampleData[0], null, 2).substring(0, 100)}...
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            AI Data Analysis Chat
          </h2>
          {selectedFile && (
            <Badge variant="outline" className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              {selectedFile.name}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
          {!selectedFile && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">Ready to Analyze Your Data</h3>
                <p className="text-muted-foreground">
                  Select a file from the left panel to start asking questions about your data
                </p>
              </div>
            </div>
          )}

          {selectedFile && (
            <>
              {getDataPreview()}
              
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : ''}`}>
                      <div
                        className={`rounded-lg p-3 ${
                          message.type === 'user'
                            ? 'bg-primary text-primary-foreground ml-auto'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                        <div className={`text-xs mt-2 opacity-70 ${
                          message.type === 'user' ? 'text-right' : 'text-left'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className={`${message.type === 'user' ? 'order-1' : 'order-2'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.type === 'user' ? 'bg-primary' : 'bg-muted'
                      }`}>
                        {message.type === 'user' ? (
                          <User className="h-4 w-4 text-primary-foreground" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {isLoading && (
                <div className="flex gap-3 justify-start mt-4">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </ScrollArea>

        {selectedFile && (
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                placeholder="Ask me anything about your data..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="min-h-[60px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                size="sm"
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        )}
      </div>
    </div>
  )
}