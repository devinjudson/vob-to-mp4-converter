import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import ConversionStatus from './components/ConversionStatus';
import Queue from './components/Queue';
import './App.css';

function App() {
  const [jobId, setJobId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [queue, setQueue] = useState([]);

  const handleUploadComplete = (id, files, outputPath) => {
    setJobId(id);
    setSelectedFiles(files);
    
    // Add files to queue with initial status
    const queueItems = files.map((file, index) => ({
      id: `${id}-${index}`,
      fileName: file.name || file,
      outputLocation: outputPath || 'Default output folder',
      progress: 0,
      status: 'uploading'
    }));
    setQueue(queueItems);
  };

  const updateQueueItemProgress = (fileId, progress, status) => {
    setQueue(prevQueue => 
      prevQueue.map(item => 
        item.id === fileId 
          ? { ...item, progress, status }
          : item
      )
    );
  };

  const updateQueue = (updatedQueue) => {
    setQueue(updatedQueue);
  };

  const handleRemoveFromQueue = (id) => {
    setQueue(queue.filter(item => item.id !== id));
  };

  const handleClearCompleted = () => {
    setQueue(queue.filter(item => item.status !== 'completed'));
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>VOB to MP4 Converter</h1>
      </header>
      
      <main className="main-container">
        {/* Main Grid */}
        <div className="grid-container">
          {/* Upload Section */}
          <div className="upload-section">
            <FileUpload onUploadComplete={handleUploadComplete} />
          </div>

          {/* Queue Section */}
          <div className="queue-section">
            <Queue 
              queue={queue} 
              files={selectedFiles}
              jobId={jobId}
              onRemove={handleRemoveFromQueue} 
              onClearCompleted={handleClearCompleted}
              onUpdateQueue={updateQueue}
            />
          </div>
        </div>

        {/* Conversion Status */}
        {jobId && (
          <div className="status-section">
            <ConversionStatus jobId={jobId} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
