'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle, XCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Device {
  id: string;
  name: string;
  type: 'fish' | 'plant';
}

interface DataImportFormProps {
  devices: Device[];
}

interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  errors: number;
  details?: string[];
}

export function DataImportForm({ devices }: DataImportFormProps) {
  const [selectedDevice, setSelectedDevice] = useState(devices[0]?.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      setResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSubmit = async () => {
    if (!file || !selectedDevice) return;

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('deviceId', selectedDevice);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setResult({
        success: true,
        message: data.message,
        imported: data.imported,
        errors: data.errors,
        details: data.details,
      });
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Import failed',
        imported: 0,
        errors: 0,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const selectedDeviceType = devices.find((d) => d.id === selectedDevice)?.type;

  return (
    <div className="space-y-6">
      {/* Device Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Target Device</label>
        <select
          value={selectedDevice}
          onChange={(e) => {
            setSelectedDevice(e.target.value);
            setFile(null);
            setResult(null);
          }}
          disabled={isUploading}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name} ({device.type})
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Make sure your CSV columns match the {selectedDeviceType} sensor format
        </p>
      </div>

      {/* File Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          file ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        {file ? (
          <div className="flex flex-col items-center">
            <FileText className="h-10 w-10 text-blue-500 mb-2" />
            <p className="text-sm font-medium text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {(file.size / 1024).toFixed(1)} KB
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="mt-2 text-xs text-red-600 hover:text-red-700"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-900">
              Drop your CSV file here
            </p>
            <p className="text-xs text-gray-500 mt-1">or click to browse</p>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!file || isUploading}
        className="w-full inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Importing...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Import Data
          </>
        )}
      </button>

      {/* Result */}
      {result && (
        <div
          className={cn(
            'rounded-md p-4',
            result.success ? 'bg-emerald-50' : 'bg-red-50'
          )}
        >
          <div className="flex items-start">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
            )}
            <div>
              <p
                className={cn(
                  'text-sm font-medium',
                  result.success ? 'text-emerald-800' : 'text-red-800'
                )}
              >
                {result.message}
              </p>
              {result.success && (
                <p className="text-sm text-emerald-700 mt-1">
                  Successfully imported {result.imported} readings
                  {result.errors > 0 && ` (${result.errors} rows skipped)`}
                </p>
              )}
              {result.details && result.details.length > 0 && (
                <ul className="mt-2 text-xs text-gray-600 space-y-1">
                  {result.details.slice(0, 5).map((detail, idx) => (
                    <li key={idx}>• {detail}</li>
                  ))}
                  {result.details.length > 5 && (
                    <li>... and {result.details.length - 5} more</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
