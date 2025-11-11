import React, { useState } from 'react';

function FileUpload({ onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [outputPath, setOutputPath] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setError(null);
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
      // Step 1: Upload files
      const uploadResponse = await fetch('http://localhost:8000/convert/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`HTTP error! status: ${uploadResponse.status}`);
      }
      
      const uploadData = await uploadResponse.json();
      const jobId = uploadData.job_id;
      
      // Step 2: Immediately start conversion
      const convertResponse = await fetch(`http://localhost:8000/convert/start/${jobId}`, {
        method: 'POST',
      });
      
      if (!convertResponse.ok) {
        throw new Error(`Conversion start failed! status: ${convertResponse.status}`);
      }
      
      onUploadComplete(jobId);
    } catch (error) {
      console.error('Upload and convert failed:', error);
      setError('Failed to upload and start conversion. Make sure the backend server is running on port 8000.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="file-upload">
      <h2>Convert VOB Files to MP4</h2>
      
      <div className="form-group">
        <label htmlFor="file-input">Select VOB Files:</label>
        <input 
          id="file-input"
          type="file" 
          multiple 
          accept=".vob,.VOB"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <p>{files.length} file(s) selected</p>
      </div>

      <div className="form-group">
        <label htmlFor="output-path">Output Location: </label>
        <input 
          id="output-path"
          type="text"
          placeholder="e.g., E:/Home Videos/converted"
          value={outputPath}
          onChange={(e) => setOutputPath(e.target.value)}
          disabled={uploading}
        />
      </div>

      {error && <p className="error">{error}</p>}
      
      <button 
        onClick={handleUploadAndConvert} 
        disabled={uploading || files.length === 0}
      >
        {uploading ? 'Uploading & Converting...' : 'Convert Videos'}
      </button>
    </div>
  );
}

export default FileUpload;