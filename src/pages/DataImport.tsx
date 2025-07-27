import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  X,
  Download,
  Database,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { useAuthStore } from '@/store/useAuthStore';

// Demo import history (only shown for demo users)
const demoImportHistory = [
  {
    id: 1,
    filename: 'fish_data_january.csv',
    type: 'Fish Environment',
    records: 2840,
    status: 'completed',
    uploadDate: '2024-01-15',
    errors: 0
  },
  {
    id: 2,
    filename: 'plant_growth_data.json',
    type: 'Plant Environment',
    records: 1560,
    status: 'completed',
    uploadDate: '2024-01-14',
    errors: 3
  },
  {
    id: 3,
    filename: 'sensor_readings_backup.csv',
    type: 'Mixed Data',
    records: 5200,
    status: 'processing',
    uploadDate: '2024-01-16',
    errors: 0
  }
];

// Demo validation errors (only shown for demo users)
const demoValidationErrors = [
  {
    row: 45,
    column: 'temperature',
    error: 'Value out of range (35.2°C exceeds maximum of 30°C)',
    severity: 'warning'
  },
  {
    row: 127,
    column: 'ph_level',
    error: 'Invalid pH value (12.5 exceeds maximum of 14)',
    severity: 'error'
  },
  {
    row: 203,
    column: 'timestamp',
    error: 'Invalid date format (expected YYYY-MM-DD HH:mm:ss)',
    severity: 'error'
  }
];

function DataImport() {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Get user data from auth store
  const { user } = useAuthStore();
  const isDemo = user?.isDemo || false;
  
  // Use demo data only for demo users, empty arrays for regular users
  const importHistory = isDemo ? demoImportHistory : [];
  const validationErrors = isDemo ? demoValidationErrors : [];

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => 
      file.type === 'text/csv' || 
      file.type === 'application/json' ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.json')
    );
    
    setUploadedFiles(prev => [...prev, ...validFiles]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateFiles = () => {
    setIsProcessing(true);
    // Simulate validation process
    setTimeout(() => {
      setValidationResults({
        totalRecords: 1250,
        validRecords: 1247,
        errors: validationErrors.length,
        warnings: 1
      });
      setIsProcessing(false);
    }, 2000);
  };

  const importData = () => {
    setIsProcessing(true);
    // Simulate import process
    setTimeout(() => {
      setIsProcessing(false);
      setUploadedFiles([]);
      setValidationResults(null);
      // Show success message
    }, 3000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'processing': return 'text-blue-600 bg-blue-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Upload className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Data Import</h1>
            <p className="text-slate-600 mt-1">Upload &amp; integrate external datasets</p>
          </div>
        </div>
        <Button className="bg-blue-500 hover:bg-blue-600">
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-blue-500" />
            <span>File Upload</span>
          </CardTitle>
          <CardDescription>Drag and drop CSV or JSON files, or click to browse</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-300 hover:border-slate-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Drop files here or click to upload
            </h3>
            <p className="text-slate-600 mb-4">
              Supports CSV and JSON formats up to 50MB
            </p>
            <input
              type="file"
              multiple
              accept=".csv,.json"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button className="bg-blue-500 hover:bg-blue-600">
                Select Files
              </Button>
            </label>
          </div>

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-slate-900 mb-3">Uploaded Files</h4>
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium text-slate-900">{file.name}</p>
                        <p className="text-sm text-slate-600">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="flex space-x-2 mt-4">
                <Button 
                  onClick={validateFiles}
                  disabled={isProcessing}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {isProcessing ? 'Validating...' : 'Validate Data'}
                </Button>
                {validationResults && (
                  <Button 
                    onClick={importData}
                    disabled={isProcessing || validationResults.errors > 0}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    {isProcessing ? 'Importing...' : 'Import Data'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Validation Results</span>
            </CardTitle>
            <CardDescription>Data quality assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{validationResults.totalRecords}</div>
                <p className="text-sm text-slate-600">Total Records</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{validationResults.validRecords}</div>
                <p className="text-sm text-slate-600">Valid Records</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{validationResults.errors}</div>
                <p className="text-sm text-slate-600">Errors</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{validationResults.warnings}</div>
                <p className="text-sm text-slate-600">Warnings</p>
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div>
                <h4 className="font-medium text-slate-900 mb-3">Issues Found</h4>
                <div className="space-y-2">
                  {validationErrors.map((error, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${getSeverityColor(error.severity)}`}>
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                        <div>
                          <p className="font-medium">Row {error.row}, Column: {error.column}</p>
                          <p className="text-sm">{error.error}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-slate-500" />
            <span>Import History</span>
          </CardTitle>
          <CardDescription>Previously imported datasets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {importHistory.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <h4 className="font-medium text-slate-900">{item.filename}</h4>
                    <p className="text-sm text-slate-600">
                      {item.type} • {item.records.toLocaleString()} records
                    </p>
                    <p className="text-xs text-slate-500">Uploaded on {item.uploadDate}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {item.errors > 0 && (
                    <span className="text-sm text-orange-600">
                      {item.errors} errors
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                  <Button variant="ghost" size="sm">
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Format Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <span>Data Format Guide</span>
          </CardTitle>
          <CardDescription>Required format for successful import</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Fish Environment Data</h4>
              <div className="bg-slate-50 p-3 rounded-lg text-sm font-mono">
                timestamp,temperature,ph_level,tds<br/>
                2024-01-01 12:00:00,24.5,7.2,850<br/>
                2024-01-01 12:05:00,24.6,7.1,852
              </div>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Plant Environment Data</h4>
              <div className="bg-slate-50 p-3 rounded-lg text-sm font-mono">
                timestamp,height,temperature,humidity<br/>
                2024-01-01 12:00:00,12.3,23.1,68<br/>
                2024-01-01 12:05:00,12.4,23.2,67
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DataImport;