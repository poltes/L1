'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
  label: string
  values: { [key: string]: string }
  missing: string[]
  width: number
  decimals: number
  measure: 'scale' | 'ordinal' | 'nominal'
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
          label: col,
          values: {},
          missing: ['', 'NULL', 'null', 'N/A', 'NA'],
          width: Math.max(8, Math.min(20, col.length + 2)),
          decimals: 2,
          measure: numericValues.length > nonEmptyValues.length * 0.7 ? 'scale' : 'nominal'
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
        label: newVarName,
        values: {},
        missing: ['', 'NULL', 'null', 'N/A', 'NA'],
        width: 10,
        decimals: 2,
        measure: 'nominal'
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setFindDialogOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault()
        setReplaceDialogOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

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

  return (
    <div className="w-full h-full flex flex-col bg-background">
      <div className="w-full h-full bg-background flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <h2 className="text-lg font-semibold">SPSS Data View - {file.name}</h2>
            <Badge variant="outline">{editedData.length} rows × {columns.length} columns</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={saveChanges} variant="outline" size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Dialog open={findDialogOpen} onOpenChange={setFindDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Search className="h-4 w-4 mr-2" />
                  Find (Ctrl+F)
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
                <Button variant="outline" size="sm">
                  <Replace className="h-4 w-4 mr-2" />
                  Replace (Ctrl+H)
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
            <Button onClick={onClose} variant="ghost" size="sm">
              Close
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'data' | 'variable')} className="flex-1 flex flex-col">
          <div className="px-4 pt-2">
            <TabsList>
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Data View
              </TabsTrigger>
              <TabsTrigger value="variable" className="flex items-center gap-2">
                <Variable className="h-4 w-4" />
                Variable View
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="data" className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b flex gap-2">
              <Button onClick={addNewRow} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
              <Button onClick={addNewVariable} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Variable
              </Button>
            </div>
            
            <div className="flex-1" style={{ overflow: 'auto', height: 'calc(100vh - 200px)' }}>
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
                        {columns.map(column => {
                          const isHighlighted = isMatchHighlighted(rowIndex, column)
                          const isCurrent = isCurrentMatch(rowIndex, column)
                          return (
                            <td 
                              key={column} 
                              className={`p-1 font-mono text-xs cursor-pointer border-r hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                                isHighlighted ? 'bg-yellow-200 dark:bg-yellow-900/30' : ''
                              } ${
                                isCurrent ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/50' : ''
                              }`}
                              style={{ minWidth: '150px', width: `${variables[column]?.width * 8 || 150}px` }}
                              onClick={() => {
                                setEditingCell({ row: rowIndex, col: column })
                                setCellValue(String(row[column] || ''))
                              }}
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
                                  {String(row[column] || '')}
                                </div>
                              )}
                            </td>
                          )
                        })}
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

          <TabsContent value="variable" className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b">
              <p className="text-sm text-muted-foreground">
                Configure variable properties, labels, and data types
              </p>
            </div>
            
            <div className="flex-1 p-4" style={{ overflow: 'auto', height: 'calc(100vh - 200px)' }}>
              <div style={{ minWidth: 'max-content', overflowX: 'auto' }}>
                <table className="border-collapse" style={{ minWidth: '100%', tableLayout: 'auto' }}>
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium min-w-[100px]">Column</th>
                      <th className="text-left p-2 font-medium min-w-[120px]">Name</th>
                      <th className="text-left p-2 font-medium min-w-[100px]">Type</th>
                      <th className="text-left p-2 font-medium min-w-[80px]">Width</th>
                      <th className="text-left p-2 font-medium min-w-[80px]">Decimals</th>
                      <th className="text-left p-2 font-medium min-w-[150px]">Label</th>
                      <th className="text-left p-2 font-medium min-w-[100px]">Measure</th>
                      <th className="text-left p-2 font-medium min-w-[150px]">Missing Values</th>
                      <th className="text-left p-2 font-medium min-w-[80px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((column, index) => {
                      const variable = variables[column]
                      return (
                        <tr key={column} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {getExcelColumnName(index)}
                          </td>
                          <td className="p-2 font-mono font-semibold">
                            {column}
                          </td>
                          <td className="p-2">
                            <Select
                              value={variable?.type || 'string'}
                              onValueChange={(value: 'numeric' | 'string' | 'date') =>
                                handleVariableUpdate(column, { type: value })
                              }
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="numeric">Numeric</SelectItem>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={variable?.width || 8}
                              onChange={(e) =>
                                handleVariableUpdate(column, { width: parseInt(e.target.value) || 8 })
                              }
                              className="w-16 text-xs"
                              min="1"
                              max="50"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={variable?.decimals || 2}
                              onChange={(e) =>
                                handleVariableUpdate(column, { decimals: parseInt(e.target.value) || 0 })
                              }
                              className="w-16 text-xs"
                              min="0"
                              max="10"
                              disabled={variable?.type !== 'numeric'}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={variable?.label || column}
                              onChange={(e) =>
                                handleVariableUpdate(column, { label: e.target.value })
                              }
                              className="text-xs min-w-[120px]"
                              placeholder="Variable label"
                            />
                          </td>
                          <td className="p-2">
                            <Select
                              value={variable?.measure || 'nominal'}
                              onValueChange={(value: 'scale' | 'ordinal' | 'nominal') =>
                                handleVariableUpdate(column, { measure: value })
                              }
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="scale">Scale</SelectItem>
                                <SelectItem value="ordinal">Ordinal</SelectItem>
                                <SelectItem value="nominal">Nominal</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2">
                            <Input
                              value={variable?.missing.join(', ') || ''}
                              onChange={(e) =>
                                handleVariableUpdate(column, { 
                                  missing: e.target.value.split(',').map(s => s.trim()) 
                                })
                              }
                              className="text-xs min-w-[120px]"
                              placeholder="e.g., , NULL, N/A"
                            />
                          </td>
                          <td className="p-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteVariable(column)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
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