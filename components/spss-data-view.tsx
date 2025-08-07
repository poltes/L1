'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Database, Variable, Download, Save, Plus, Trash2, Edit3 } from 'lucide-react'

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

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-7xl h-[90vh] bg-background border rounded-lg shadow-lg flex flex-col">
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

          <TabsContent value="data" className="flex-1 overflow-hidden">
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
            
            <ScrollArea className="flex-1">
              <div className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      {columns.map(column => (
                        <TableHead key={column} className="min-w-[120px] font-mono text-xs">
                          <div className="flex flex-col">
                            <span className="font-semibold">{variables[column]?.label || column}</span>
                            <span className="text-muted-foreground">({variables[column]?.type})</span>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editedData.map((row, rowIndex) => (
                      <TableRow key={rowIndex} className="hover:bg-muted/50">
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {rowIndex + 1}
                        </TableCell>
                        {columns.map(column => (
                          <TableCell 
                            key={column} 
                            className="p-1 font-mono text-xs cursor-pointer border-r hover:bg-blue-50 dark:hover:bg-blue-900/20"
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
                          </TableCell>
                        ))}
                        <TableCell className="p-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRow(rowIndex)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="variable" className="flex-1 overflow-hidden">
            <div className="p-4 border-b">
              <p className="text-sm text-muted-foreground">
                Configure variable properties, labels, and data types
              </p>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Width</TableHead>
                      <TableHead>Decimals</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Measure</TableHead>
                      <TableHead>Missing Values</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {columns.map(column => {
                      const variable = variables[column]
                      return (
                        <TableRow key={column}>
                          <TableCell className="font-mono font-semibold">
                            {column}
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                          <TableCell>
                            <Input
                              value={variable?.label || column}
                              onChange={(e) =>
                                handleVariableUpdate(column, { label: e.target.value })
                              }
                              className="text-xs"
                              placeholder="Variable label"
                            />
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                          <TableCell>
                            <Input
                              value={variable?.missing.join(', ') || ''}
                              onChange={(e) =>
                                handleVariableUpdate(column, { 
                                  missing: e.target.value.split(',').map(s => s.trim()) 
                                })
                              }
                              className="text-xs"
                              placeholder="e.g., , NULL, N/A"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteVariable(column)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}