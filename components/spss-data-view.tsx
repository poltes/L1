'use client'

import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Database, Variable, Download, Save, Plus, Trash2, Edit3, Search, Replace } from 'lucide-react'

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  data: any[]
  uploadedAt: Date
}

interface VariableInfo {
  name: string
  type: 'numeric' | 'string' | 'date'
  width: number
  decimals: number
  label: string
  values: { [key: string]: string }
  missing: string[]
  columns: number
  align: 'left' | 'center' | 'right'
  measure: 'scale' | 'ordinal' | 'nominal'
  role: 'input' | 'target' | 'both' | 'none' | 'partition' | 'split'
}

interface SPSSDataViewProps {
  file: UploadedFile
  onClose: () => void
  onSave: (updatedData: any[], variables: { [key: string]: VariableInfo }) => void
}

export function SPSSDataView({ file, onClose, onSave }: SPSSDataViewProps) {
  const [activeTab, setActiveTab] = useState<'data' | 'variable'>('data')
  const [editedData, setEditedData] = useState<any[]>([])
  const [variables, setVariables] = useState<{ [key: string]: VariableInfo }>({})
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null)
  const [cellValue, setCellValue] = useState('')
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [findDialogOpen, setFindDialogOpen] = useState(false)
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [foundMatches, setFoundMatches] = useState<{ row: number; col: string }[]>([])
  const [currentMatch, setCurrentMatch] = useState(0)
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string } | null>(null)
  const [navigationThrottle, setNavigationThrottle] = useState<NodeJS.Timeout | null>(null)
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({})
  const [isResizing, setIsResizing] = useState<string | null>(null)
  const resizeStartX = useRef<number>(0)
  const resizeStartWidth = useRef<number>(0)

  // Initialize data and variables
  useEffect(() => {
    setEditedData([...file.data])
    
    if (file.data.length > 0) {
      const columns = Object.keys(file.data[0])
      const varsInfo: { [key: string]: VariableInfo } = {}
      
      columns.forEach(col => {
        const values = file.data.map(row => row[col])
        const nonEmptyValues = values.filter(val => val !== null && val !== undefined && val !== '')
        const numericValues = nonEmptyValues.filter(val => !isNaN(parseFloat(val)) && isFinite(val))
        
        varsInfo[col] = {
          name: col,
          type: numericValues.length > nonEmptyValues.length * 0.7 ? 'numeric' : 'string',
          width: Math.max(8, Math.min(20, col.length + 2)),
          decimals: 2,
          label: col,
          values: {},
          missing: ['', 'NULL', 'null', 'N/A', 'NA'],
          columns: Math.max(8, Math.min(20, col.length + 2)),
          align: numericValues.length > nonEmptyValues.length * 0.7 ? 'right' : 'left',
          measure: numericValues.length > nonEmptyValues.length * 0.7 ? 'scale' : 'nominal',
          role: 'input'
        }
        
        // Detect potential value labels for categorical data
        if (varsInfo[col].type === 'string') {
          const uniqueValues = Array.from(new Set(nonEmptyValues.slice(0, 20)))
          if (uniqueValues.length <= 10 && uniqueValues.length > 1) {
            varsInfo[col].measure = 'nominal'
          }
        }
      })
      
      setVariables(varsInfo)
    }
  }, [file.data])

  const columns = useMemo(() => {
    return editedData.length > 0 ? Object.keys(editedData[0]) : []
  }, [editedData])

  // Generate Excel-style column names (A, B, C, ..., AA, AB, etc.)
  const getExcelColumnName = (index: number): string => {
    let result = ''
    while (index >= 0) {
      result = String.fromCharCode(65 + (index % 26)) + result
      index = Math.floor(index / 26) - 1
    }
    return result
  }

  const handleCellEdit = (rowIndex: number, column: string, value: string) => {
    const newData = [...editedData]
    
    // Convert value based on variable type
    const variable = variables[column]
    let processedValue: any = value
    
    if (variable?.type === 'numeric' && value !== '') {
      const numValue = parseFloat(value)
      processedValue = !isNaN(numValue) ? numValue : value
    }
    
    newData[rowIndex][column] = processedValue
    setEditedData(newData)
    setEditingCell(null)
    setCellValue('')
    // Maintain cell selection after editing
    setSelectedCell({ row: rowIndex, col: column })
  }

  const handleVariableUpdate = (columnName: string, updates: Partial<VariableInfo>) => {
    setVariables(prev => ({
      ...prev,
      [columnName]: { ...prev[columnName], ...updates }
    }))
  }

  const addNewRow = () => {
    const newRow: any = {}
    columns.forEach(col => {
      newRow[col] = variables[col]?.type === 'numeric' ? 0 : ''
    })
    setEditedData(prev => [...prev, newRow])
    toast.success('New row added')
  }

  const deleteRow = (rowIndex: number) => {
    setEditedData(prev => prev.filter((_, index) => index !== rowIndex))
    toast.success('Row deleted')
  }

  const addNewVariable = () => {
    const newVarName = `VAR${columns.length + 1}`
    const newData = editedData.map(row => ({ ...row, [newVarName]: '' }))
    
    setEditedData(newData)
    setVariables(prev => ({
      ...prev,
      [newVarName]: {
        name: newVarName,
        type: 'string',
        width: 10,
        decimals: 2,
        label: newVarName,
        values: {},
        missing: ['', 'NULL', 'null', 'N/A', 'NA'],
        columns: 10,
        align: 'left',
        measure: 'nominal',
        role: 'input'
      }
    }))
    toast.success('New variable added')
  }

  const deleteVariable = (columnName: string) => {
    const newData = editedData.map(row => {
      const newRow = { ...row }
      delete newRow[columnName]
      return newRow
    })
    
    setEditedData(newData)
    setVariables(prev => {
      const newVars = { ...prev }
      delete newVars[columnName]
      return newVars
    })
    toast.success('Variable deleted')
  }

  const exportData = () => {
    try {
      const csvContent = [
        columns.join(','),
        ...editedData.map(row => 
          columns.map(col => {
            const value = row[col]
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
          }).join(',')
        )
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${file.name.replace(/\.[^/.]+$/, '')}_edited.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported successfully')
    } catch (error) {
      toast.error('Failed to export data')
    }
  }

  const saveChanges = () => {
    onSave(editedData, variables)
    toast.success('Changes saved successfully')
  }

  // Find functionality
  const handleFind = useCallback(() => {
    if (!findText.trim()) {
      setFoundMatches([])
      return
    }

    const matches: { row: number; col: string }[] = []
    const searchValue = caseSensitive ? findText : findText.toLowerCase()

    editedData.forEach((row, rowIndex) => {
      columns.forEach(column => {
        const cellValue = String(row[column] || '')
        const searchIn = caseSensitive ? cellValue : cellValue.toLowerCase()
        if (searchIn.includes(searchValue)) {
          matches.push({ row: rowIndex, col: column })
        }
      })
    })

    setFoundMatches(matches)
    setCurrentMatch(0)
    
    if (matches.length === 0) {
      toast.info('No matches found')
    } else {
      toast.success(`Found ${matches.length} matches`)
    }
  }, [findText, editedData, columns, caseSensitive])

  // Replace functionality
  const handleReplace = useCallback((replaceAll: boolean = false) => {
    if (!findText.trim()) {
      toast.error('Please enter text to find')
      return
    }

    let replacements = 0
    const newData = [...editedData]
    const searchValue = caseSensitive ? findText : findText.toLowerCase()

    newData.forEach((row, rowIndex) => {
      columns.forEach(column => {
        const cellValue = String(row[column] || '')
        const searchIn = caseSensitive ? cellValue : cellValue.toLowerCase()
        
        if (replaceAll) {
          if (searchIn.includes(searchValue)) {
            const regex = new RegExp(
              findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
              caseSensitive ? 'g' : 'gi'
            )
            row[column] = cellValue.replace(regex, replaceText)
            replacements++
          }
        } else {
          // Replace only current match
          if (currentMatch < foundMatches.length) {
            const match = foundMatches[currentMatch]
            if (match.row === rowIndex && match.col === column) {
              const regex = new RegExp(
                findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                caseSensitive ? '' : 'i'
              )
              row[column] = cellValue.replace(regex, replaceText)
              replacements++
            }
          }
        }
      })
    })

    if (replacements > 0) {
      setEditedData(newData)
      toast.success(`Replaced ${replacements} occurrence${replacements > 1 ? 's' : ''}`)
      // Refresh matches after replacement
      setTimeout(() => handleFind(), 100)
    } else {
      toast.info('No replacements made')
    }
  }, [findText, replaceText, editedData, columns, caseSensitive, currentMatch, foundMatches, handleFind])

  const scrollToCell = useCallback((rowIndex: number, colIndex: number) => {
    const tableContainer = document.querySelector('[data-table-container]')
    if (!tableContainer) return

    const cellElement = tableContainer.querySelector(
      `[data-cell-row="${rowIndex}"][data-cell-col="${columns[colIndex]}"]`
    )
    
    if (cellElement) {
      cellElement.scrollIntoView({
        behavior: 'auto',
        block: 'center',
        inline: 'center'
      })
    }
  }, [columns])

  // Ultra-fast keyboard navigation with immediate response
  const handleCellNavigation = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!selectedCell || editedData.length === 0) return
    
    const currentRowIndex = selectedCell.row
    const currentColIndex = columns.indexOf(selectedCell.col)
    
    let newRowIndex = currentRowIndex
    let newColIndex = currentColIndex

    switch (direction) {
      case 'up':
        newRowIndex = Math.max(0, currentRowIndex - 1)
        break
      case 'down':
        newRowIndex = Math.min(editedData.length - 1, currentRowIndex + 1)
        break
      case 'left':
        newColIndex = Math.max(0, currentColIndex - 1)
        break
      case 'right':
        newColIndex = Math.min(columns.length - 1, currentColIndex + 1)
        break
    }

    if (newRowIndex !== currentRowIndex || newColIndex !== currentColIndex) {
      const newSelectedCell = { row: newRowIndex, col: columns[newColIndex] }
      setSelectedCell(newSelectedCell)
      // Use requestAnimationFrame for the smoothest possible scrolling
      requestAnimationFrame(() => scrollToCell(newRowIndex, newColIndex))
    }
  }, [selectedCell, editedData, columns, scrollToCell])

  // Keyboard shortcuts and navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle find/replace shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setFindDialogOpen(true)
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault()
        setReplaceDialogOpen(true)
        return
      }

      // Only handle navigation in Data View for smooth performance
      if (activeTab === 'data' && !findDialogOpen && !replaceDialogOpen && !editingCell) {
        // Check if focus is on an input element
        const activeElement = document.activeElement
        if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'SELECT' || activeElement?.tagName === 'TEXTAREA') {
          return // Don't interfere with form inputs
        }

        // Arrow key navigation - immediate response
        if (e.key.startsWith('Arrow')) {
          e.preventDefault()
          e.stopImmediatePropagation()
          
          switch (e.key) {
            case 'ArrowUp':
              handleCellNavigation('up')
              break
            case 'ArrowDown':
              handleCellNavigation('down')
              break
            case 'ArrowLeft':
              handleCellNavigation('left')
              break
            case 'ArrowRight':
              handleCellNavigation('right')
              break
          }
        } else if (e.key === 'Enter' && selectedCell) {
          e.preventDefault()
          e.stopImmediatePropagation()
          setEditingCell(selectedCell)
          setCellValue(String(editedData[selectedCell.row][selectedCell.col] || ''))
        } else if (e.key === 'Tab') {
          e.preventDefault()
          e.stopImmediatePropagation()
          if (e.shiftKey) {
            handleCellNavigation('left')
          } else {
            handleCellNavigation('right')
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleCellNavigation, findDialogOpen, replaceDialogOpen, editingCell, selectedCell, editedData, activeTab])

  const navigateToMatch = (direction: 'next' | 'prev') => {
    if (foundMatches.length === 0) return
    
    if (direction === 'next') {
      setCurrentMatch((prev) => (prev + 1) % foundMatches.length)
    } else {
      setCurrentMatch((prev) => (prev - 1 + foundMatches.length) % foundMatches.length)
    }
  }

  const isMatchHighlighted = (rowIndex: number, column: string) => {
    return foundMatches.some(match => match.row === rowIndex && match.col === column)
  }

  const isCurrentMatch = (rowIndex: number, column: string) => {
    if (foundMatches.length === 0) return false
    const currentMatchData = foundMatches[currentMatch]
    return currentMatchData && currentMatchData.row === rowIndex && currentMatchData.col === column
  }

  // Column resize handlers
  const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault()
    setIsResizing(columnKey)
    resizeStartX.current = e.clientX
    resizeStartWidth.current = columnWidths[columnKey] || getDefaultColumnWidth(columnKey)
  }

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return
    const deltaX = e.clientX - resizeStartX.current
    const newWidth = Math.max(30, resizeStartWidth.current + deltaX)
    setColumnWidths(prev => ({
      ...prev,
      [isResizing]: newWidth
    }))
  }, [isResizing])

  const handleResizeEnd = useCallback(() => {
    setIsResizing(null)
  }, [])

  const getDefaultColumnWidth = (columnKey: string) => {
    const defaults: { [key: string]: number } = {
      index: 30,
      name: 80,
      type: 60,
      width: 50,
      decimals: 60,
      label: 120,
      values: 80,
      missing: 60,
      columns: 60,
      align: 50,
      measure: 70,
      role: 60
    }
    return defaults[columnKey] || 80
  }

  // Add mouse event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
      return () => {
        document.removeEventListener('mousemove', handleResizeMove)
        document.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])

  // Memoized cell component for better performance
  const DataCell = memo(({ 
    rowIndex, 
    column, 
    value, 
    isHighlighted, 
    isCurrent, 
    isSelected, 
    onEdit 
  }: {
    rowIndex: number
    column: string
    value: any
    isHighlighted: boolean
    isCurrent: boolean
    isSelected: boolean
    onEdit: () => void
  }) => {
    return (
      <td 
        data-cell-row={rowIndex}
        data-cell-col={column}
        className={`p-1 font-mono text-xs cursor-pointer border-r hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
          isHighlighted ? 'bg-yellow-200 dark:bg-yellow-900/30' : ''
        } ${
          isCurrent ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/50' : ''
        } ${
          isSelected && !editingCell ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' : ''
        }`}
        style={{ minWidth: '150px', width: `${variables[column]?.columns * 8 || 150}px` }}
        onClick={onEdit}
      >
        {editingCell?.row === rowIndex && editingCell?.col === column ? (
          <Input
            value={cellValue}
            onChange={(e) => setCellValue(e.target.value)}
            onBlur={() => handleCellEdit(rowIndex, column, cellValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCellEdit(rowIndex, column, cellValue)
              } else if (e.key === 'Escape') {
                setEditingCell(null)
                setCellValue('')
              }
            }}
            className="h-6 text-xs font-mono border-0 p-1 focus:ring-1"
            autoFocus
          />
        ) : (
          <div className="min-h-[24px] flex items-center p-1">
            {String(value || '')}
          </div>
        )}
      </td>
    )
  })

  return (
    <div className="w-full h-full flex flex-col bg-background">
      <div className="w-full h-full bg-background flex flex-col">
        <div className="flex items-center justify-between p-1 border-b">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <h2 className="text-xs font-semibold">SPSS Data View - {file.name}</h2>
            <Badge variant="outline" className="text-xs h-5 px-1">{editedData.length} × {columns.length}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button onClick={exportData} variant="outline" size="sm" className="h-6 text-xs px-2">
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
            <Button onClick={saveChanges} variant="outline" size="sm" className="h-6 text-xs px-2">
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Dialog open={findDialogOpen} onOpenChange={setFindDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 text-xs px-2">
                  <Search className="h-3 w-3 mr-1" />
                  Find
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Find in Data</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="find-input">Find what:</Label>
                    <Input
                      id="find-input"
                      value={findText}
                      onChange={(e) => setFindText(e.target.value)}
                      placeholder="Enter text to find"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleFind()
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="case-sensitive"
                      checked={caseSensitive}
                      onCheckedChange={(checked) => setCaseSensitive(checked as boolean)}
                    />
                    <Label htmlFor="case-sensitive">Case sensitive</Label>
                  </div>
                  {foundMatches.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {currentMatch + 1} of {foundMatches.length} matches
                      </span>
                      <Button size="sm" onClick={() => navigateToMatch('prev')}>
                        Previous
                      </Button>
                      <Button size="sm" onClick={() => navigateToMatch('next')}>
                        Next
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={handleFind}>Find All</Button>
                    <Button variant="outline" onClick={() => setFindDialogOpen(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 text-xs px-2">
                  <Replace className="h-3 w-3 mr-1" />
                  Replace
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Find and Replace</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="find-replace-input">Find what:</Label>
                    <Input
                      id="find-replace-input"
                      value={findText}
                      onChange={(e) => setFindText(e.target.value)}
                      placeholder="Enter text to find"
                    />
                  </div>
                  <div>
                    <Label htmlFor="replace-input">Replace with:</Label>
                    <Input
                      id="replace-input"
                      value={replaceText}
                      onChange={(e) => setReplaceText(e.target.value)}
                      placeholder="Enter replacement text"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="case-sensitive-replace"
                      checked={caseSensitive}
                      onCheckedChange={(checked) => setCaseSensitive(checked as boolean)}
                    />
                    <Label htmlFor="case-sensitive-replace">Case sensitive</Label>
                  </div>
                  {foundMatches.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {currentMatch + 1} of {foundMatches.length} matches
                      </span>
                      <Button size="sm" onClick={() => navigateToMatch('prev')}>
                        Previous
                      </Button>
                      <Button size="sm" onClick={() => navigateToMatch('next')}>
                        Next
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={handleFind}>Find All</Button>
                    <Button onClick={() => handleReplace(false)}>Replace</Button>
                    <Button onClick={() => handleReplace(true)} variant="destructive">
                      Replace All
                    </Button>
                    <Button variant="outline" onClick={() => setReplaceDialogOpen(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={onClose} variant="ghost" size="sm" className="h-6 text-xs px-2">
              Close
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'data' | 'variable')} className="flex-1 flex flex-col">
          <div className="px-1 py-0">
            <TabsList className="h-7 p-0">
              <TabsTrigger value="data" className="flex items-center gap-1 h-6 text-xs px-2">
                <Database className="h-3 w-3" />
                Data View
              </TabsTrigger>
              <TabsTrigger value="variable" className="flex items-center gap-1 h-6 text-xs px-2">
                <Variable className="h-3 w-3" />
                Variable View
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="data" className="flex-1 flex flex-col overflow-hidden">
            <div className="p-1 border-b flex gap-1">
              <Button onClick={addNewRow} size="sm" variant="outline" className="h-6 text-xs px-2">
                <Plus className="h-3 w-3 mr-1" />
                Add Row
              </Button>
              <Button onClick={addNewVariable} size="sm" variant="outline" className="h-6 text-xs px-2">
                <Plus className="h-3 w-3 mr-1" />
                Add Variable
              </Button>
            </div>
            
            <div 
              className="flex-1" 
              style={{ overflow: 'auto', height: 'calc(100vh - 60px)' }}
              data-table-container
              tabIndex={0}
              onClick={() => {
                if (!selectedCell && editedData.length > 0 && columns.length > 0) {
                  setSelectedCell({ row: 0, col: columns[0] })
                }
              }}
            >
              <div style={{ minWidth: 'max-content', overflowX: 'auto' }}>
                <table className="border-collapse" style={{ minWidth: '100%', tableLayout: 'auto' }}>
                  <thead className="sticky top-0 bg-background z-10 border-b">
                    <tr>
                      <th className="w-16 p-2 text-left text-xs font-medium text-muted-foreground border-r sticky left-0 bg-background">
                        #
                      </th>
                      {columns.map((column, index) => (
                        <th key={column} className="p-2 text-left font-mono text-xs border-r" style={{ minWidth: '150px', width: `${variables[column]?.width * 8 || 150}px` }}>
                          <div className="flex flex-col">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{getExcelColumnName(index)}</span>
                            <span className="font-medium">{variables[column]?.label || column}</span>
                            <span className="text-muted-foreground text-[10px]">({variables[column]?.type})</span>
                          </div>
                        </th>
                      ))}
                      <th className="w-16 p-2 text-left text-xs font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {editedData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-muted/50 border-b">
                        <td className="p-1 text-xs text-muted-foreground font-mono border-r sticky left-0 bg-background">
                          {rowIndex + 1}
                        </td>
                        {columns.map(column => (
                          <DataCell
                            key={`${rowIndex}-${column}`}
                            rowIndex={rowIndex}
                            column={column}
                            value={row[column]}
                            isHighlighted={isMatchHighlighted(rowIndex, column)}
                            isCurrent={isCurrentMatch(rowIndex, column)}
                            isSelected={selectedCell?.row === rowIndex && selectedCell?.col === column}
                            onEdit={() => {
                              setSelectedCell({ row: rowIndex, col: column })
                              setEditingCell({ row: rowIndex, col: column })
                              setCellValue(String(row[column] || ''))
                            }}
                          />
                        ))}
                        <td className="p-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRow(rowIndex)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="variable" className="flex-1 flex flex-col overflow-hidden mt-0">
            <div className="flex-1" style={{ overflow: 'auto', height: 'calc(100vh - 60px)' }}>
              <div style={{ minWidth: 'max-content', overflowX: 'auto' }}>
                <table className="border-collapse w-full" style={{ minWidth: '100%', tableLayout: 'auto' }}>
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="border-b bg-gray-100 dark:bg-gray-800">
                      <th className="text-left py-0.5 px-1 font-medium text-xs text-gray-600 dark:text-gray-300 border-r relative" style={{width: columnWidths['index'] || 30, minWidth: '30px'}}>
                        
                        <div 
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                          onMouseDown={(e) => handleResizeStart(e, 'index')}
                        />
                      </th>
                      <th className="text-left py-0.5 px-1 font-medium text-xs text-gray-600 dark:text-gray-300 border-r relative" style={{width: columnWidths['name'] || 80, minWidth: '60px'}}>
                        Name
                        <div 
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                          onMouseDown={(e) => handleResizeStart(e, 'name')}
                        />
                      </th>
                      <th className="text-left py-0.5 px-1 font-medium text-xs text-gray-600 dark:text-gray-300 border-r relative" style={{width: columnWidths['type'] || 60, minWidth: '50px'}}>
                        Type
                        <div 
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                          onMouseDown={(e) => handleResizeStart(e, 'type')}
                        />
                      </th>
                      <th className="text-left py-0.5 px-1 font-medium text-xs text-gray-600 dark:text-gray-300 border-r relative" style={{width: columnWidths['width'] || 50, minWidth: '40px'}}>
                        Width
                        <div 
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                          onMouseDown={(e) => handleResizeStart(e, 'width')}
                        />
                      </th>
                      <th className="text-left py-0.5 px-1 font-medium text-xs text-gray-600 dark:text-gray-300 border-r relative" style={{width: columnWidths['decimals'] || 60, minWidth: '50px'}}>
                        Decimals
                        <div 
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                          onMouseDown={(e) => handleResizeStart(e, 'decimals')}
                        />
                      </th>
                      <th className="text-left py-0.5 px-1 font-medium text-xs text-gray-600 dark:text-gray-300 border-r relative" style={{width: columnWidths['label'] || 120, minWidth: '80px'}}>
                        Label
                        <div 
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                          onMouseDown={(e) => handleResizeStart(e, 'label')}
                        />
                      </th>
                      <th className="text-left py-0.5 px-1 font-medium text-xs text-gray-600 dark:text-gray-300 border-r relative" style={{width: columnWidths['values'] || 80, minWidth: '60px'}}>
                        Values
                        <div 
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                          onMouseDown={(e) => handleResizeStart(e, 'values')}
                        />
                      </th>
                      <th className="text-left py-0.5 px-1 font-medium text-xs text-gray-600 dark:text-gray-300 border-r relative" style={{width: columnWidths['missing'] || 60, minWidth: '50px'}}>
                        Missing
                        <div 
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                          onMouseDown={(e) => handleResizeStart(e, 'missing')}
                        />
                      </th>
                      <th className="text-left py-0.5 px-1 font-medium text-xs text-gray-600 dark:text-gray-300 border-r relative" style={{width: columnWidths['columns'] || 60, minWidth: '50px'}}>
                        Columns
                        <div 
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                          onMouseDown={(e) => handleResizeStart(e, 'columns')}
                        />
                      </th>
                      <th className="text-left py-0.5 px-1 font-medium text-xs text-gray-600 dark:text-gray-300 border-r relative" style={{width: columnWidths['align'] || 50, minWidth: '40px'}}>
                        Align
                        <div 
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                          onMouseDown={(e) => handleResizeStart(e, 'align')}
                        />
                      </th>
                      <th className="text-left py-0.5 px-1 font-medium text-xs text-gray-600 dark:text-gray-300 border-r relative" style={{width: columnWidths['measure'] || 70, minWidth: '60px'}}>
                        Measure
                        <div 
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                          onMouseDown={(e) => handleResizeStart(e, 'measure')}
                        />
                      </th>
                      <th className="text-left py-0.5 px-1 font-medium text-xs text-gray-600 dark:text-gray-300 border-r relative" style={{width: columnWidths['role'] || 60, minWidth: '50px'}}>
                        Role
                        <div 
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                          onMouseDown={(e) => handleResizeStart(e, 'role')}
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((column, index) => {
                      const variable = variables[column]
                      return (
                        <tr key={column} className="border-b hover:bg-blue-50 dark:hover:bg-blue-900/20 h-6">
                          <td className="py-0.5 px-1 text-xs font-mono text-center text-gray-500 border-r bg-gray-50 dark:bg-gray-800" style={{width: columnWidths['index'] || 30}}>
                            {index + 1}
                          </td>
                          <td className="py-0.5 px-1 border-r" style={{width: columnWidths['name'] || 80}}>
                            <div className="text-xs font-mono font-medium text-gray-900 dark:text-gray-100 truncate">
                              {column}
                            </div>
                          </td>
                          <td className="py-0.5 px-1 border-r" style={{width: columnWidths['type'] || 60}}>
                            <Select
                              value={variable?.type || 'string'}
                              onValueChange={(value: 'numeric' | 'string' | 'date') =>
                                handleVariableUpdate(column, { type: value })
                              }
                            >
                              <SelectTrigger className="h-5 text-xs border-0 bg-transparent px-1 py-0 focus:ring-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="numeric">Numeric</SelectItem>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-0.5 px-1 border-r" style={{width: columnWidths['width'] || 50}}>
                            <Input
                              type="number"
                              value={variable?.width || 8}
                              onChange={(e) =>
                                handleVariableUpdate(column, { width: parseInt(e.target.value) || 8 })
                              }
                              className="h-5 text-xs text-center border-0 bg-transparent px-1 py-0 focus:ring-0"
                              min="1"
                              max="50"
                            />
                          </td>
                          <td className="py-0.5 px-1 border-r" style={{width: columnWidths['decimals'] || 60}}>
                            <Input
                              type="number"
                              value={variable?.decimals || 0}
                              onChange={(e) =>
                                handleVariableUpdate(column, { decimals: parseInt(e.target.value) || 0 })
                              }
                              className="h-5 text-xs text-center border-0 bg-transparent px-1 py-0 focus:ring-0"
                              min="0"
                              max="10"
                              disabled={variable?.type !== 'numeric'}
                            />
                          </td>
                          <td className="py-0.5 px-1 border-r" style={{width: columnWidths['label'] || 120}}>
                            <Input
                              value={variable?.label || ''}
                              onChange={(e) =>
                                handleVariableUpdate(column, { label: e.target.value })
                              }
                              className="h-5 text-xs border-0 bg-transparent px-1 py-0 focus:ring-0"
                              placeholder=""
                            />
                          </td>
                          <td className="py-0.5 px-1 border-r" style={{width: columnWidths['values'] || 80}}>
                            <div className="h-5 text-xs text-center text-gray-400 flex items-center justify-center">
                              None
                            </div>
                          </td>
                          <td className="py-0.5 px-1 border-r" style={{width: columnWidths['missing'] || 60}}>
                            <div className="h-5 text-xs text-center text-gray-400 flex items-center justify-center">
                              None
                            </div>
                          </td>
                          <td className="py-0.5 px-1 border-r" style={{width: columnWidths['columns'] || 60}}>
                            <Input
                              type="number"
                              value={variable?.columns || 8}
                              onChange={(e) =>
                                handleVariableUpdate(column, { columns: parseInt(e.target.value) || 8 })
                              }
                              className="h-5 text-xs text-center border-0 bg-transparent px-1 py-0 focus:ring-0"
                              min="1"
                              max="50"
                            />
                          </td>
                          <td className="py-0.5 px-1 border-r" style={{width: columnWidths['align'] || 50}}>
                            <Select
                              value={variable?.align || 'left'}
                              onValueChange={(value: 'left' | 'center' | 'right') =>
                                handleVariableUpdate(column, { align: value })
                              }
                            >
                              <SelectTrigger className="h-5 text-xs border-0 bg-transparent px-1 py-0 focus:ring-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left">Left</SelectItem>
                                <SelectItem value="center">Center</SelectItem>
                                <SelectItem value="right">Right</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-0.5 px-1 border-r" style={{width: columnWidths['measure'] || 70}}>
                            <Select
                              value={variable?.measure || 'nominal'}
                              onValueChange={(value: 'scale' | 'ordinal' | 'nominal') =>
                                handleVariableUpdate(column, { measure: value })
                              }
                            >
                              <SelectTrigger className="h-5 text-xs border-0 bg-transparent px-1 py-0 focus:ring-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="scale">Scale</SelectItem>
                                <SelectItem value="ordinal">Ordinal</SelectItem>
                                <SelectItem value="nominal">Nominal</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-0.5 px-1 border-r" style={{width: columnWidths['role'] || 60}}>
                            <Select
                              value={variable?.role || 'input'}
                              onValueChange={(value: 'input' | 'target' | 'both' | 'none' | 'partition' | 'split') =>
                                handleVariableUpdate(column, { role: value })
                              }
                            >
                              <SelectTrigger className="h-5 text-xs border-0 bg-transparent px-1 py-0 focus:ring-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="input">Input</SelectItem>
                                <SelectItem value="target">Target</SelectItem>
                                <SelectItem value="both">Both</SelectItem>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="partition">Partition</SelectItem>
                                <SelectItem value="split">Split</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}