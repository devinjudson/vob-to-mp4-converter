import React, { useState } from 'react';
import { Upload, Folder } from "lucide-react"

function FileUpload({ onUploadComplete, onUploadProgress }) {
  const [files, setFiles] = useState([]);
  const [outputPath, setOutputPath] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setError(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.name.toLowerCase().endsWith('.vob')
    );
    if (droppedFiles.length > 0) {
      setFiles(droppedFiles);
      setError(null);
    }
  };

  const handleUploadAndConvert = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    if (outputPath) {
      formData.append('output_path', outputPath);
    }

    try {
      // Step 1: Upload files with progress tracking
      const uploadResponse = await fetch('http://localhost:8000/convert/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`HTTP error! status: ${uploadResponse.status}`);
      }
      
      const uploadData = await uploadResponse.json();
      const jobId = uploadData.job_id;
      
      // Notify parent that upload is complete and get job ID
      onUploadComplete(jobId, files, outputPath);
      
      // Step 2: Immediately start conversion
      const convertResponse = await fetch(`http://localhost:8000/convert/start/${jobId}`, {
        method: 'POST',
      });
      
      if (!convertResponse.ok) {
        throw new Error(`Conversion start failed! status: ${convertResponse.status}`);
      }
      
      // Clear the selected files after successful upload
      setFiles([]);
      setOutputPath('');
    } catch (error) {
      console.error('Upload and convert failed:', error);
      setError('Failed to upload and start conversion. Make sure the backend server is running on port 8000.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="file-upload">
      <h2>Upload Files</h2>
      <h3>Select VOB files to convert</h3>

      {/* File Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
      >
        <p className="drop-text">Drag and drop VOB files here</p>
        <p className="drop-text-or">or</p>
        <label htmlFor="file-input" className="browse-button">
          Browse Files
        </label>
        <input 
          id="file-input"
          type="file" 
          multiple 
          accept=".vob,.VOB"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </div>
      
      {files.length > 0 && (
        <p className="file-count">{files.length} file(s) selected</p>
      )}

      <div className="form-group">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Folder className="h-4 w-4" />
            Output Location
          </label>
        <input 
          id="output-path"
          type="text"
          placeholder="e.g., E:/Home Videos/converted"
          value={outputPath}
          onChange={(e) => setOutputPath(e.target.value)}
          disabled={uploading}
        />
        <p className="help-text">Enter the full path where you want to save the MP4 file</p>
      </div>

      {error && <p className="error">{error}</p>}
      
      <button 
        onClick={handleUploadAndConvert} 
        disabled={uploading || files.length === 0}
      >
        {uploading ? 'Uploading & Converting...' : 'Add to Queue'}
      </button>
    </div>
  );
}

export default FileUpload;