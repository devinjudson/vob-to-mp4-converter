import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Zap, AlertCircle, Clock, X } from 'lucide-react';

function Queue({ files, jobId, queue, onRemove, onClearCompleted, onUpdateQueue }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const queueRef = useRef(queue);
  const onUpdateQueueRef = useRef(onUpdateQueue);

  // Update refs when props change
  useEffect(() => {
    queueRef.current = queue;
    onUpdateQueueRef.current = onUpdateQueue;
  });

  useEffect(() => {
    if (!jobId) return;

    const fetchProgress = async () => {
      try {
        const response = await fetch(`http://localhost:8000/convert/status/${jobId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch conversion status');
        }
        const data = await response.json();
        setStatus(data);
        
        // Update queue items based on backend status
        const currentQueue = queueRef.current;
        const updateFunc = onUpdateQueueRef.current;
        
        if (updateFunc && currentQueue && currentQueue.length > 0) {
          const updatedQueue = currentQueue.map((item, index) => {
            let itemStatus = 'pending';
            let itemProgress = 0;
            
            if (data.status === 'uploading') {
              itemStatus = 'uploading';
              itemProgress = 50; // Show upload progress
            } else if (data.status === 'converting') {
              itemStatus = 'converting';
              // Use progress from backend if available
              itemProgress = data.progress || 50;
            } else if (data.status === 'completed') {
              itemStatus = 'completed';
              itemProgress = 100;
            } else if (data.status === 'failed') {
              itemStatus = 'error';
              itemProgress = 0;
            }
            
            return {
              ...item,
              status: itemStatus,
              progress: itemProgress,
              errorMessage: data.status === 'failed' ? data.error : undefined
            };
          });
          
          // Only update if there are actual changes
          const hasChanges = updatedQueue.some((item, index) => 
            !currentQueue[index] || 
            item.status !== currentQueue[index].status || 
            item.progress !== currentQueue[index].progress
          );
          
          if (hasChanges) {
            updateFunc(updatedQueue);
          }
        }
      } catch (err) {
        setError(err.message);
      }
    };

    fetchProgress();
    const interval = setInterval(fetchProgress, 1000);
    return () => clearInterval(interval);
  }, [jobId]);

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "converting":
      case "uploading":
        return <Zap className="h-5 w-5 animate-pulse text-blue-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "converting":
        return "Converting...";
      case "uploading":
        return "Uploading...";
      case "error":
        return "Error";
      default:
        return "Pending";
    }
  };

  // If queue prop is provided, use it for the new queue UI
  if (queue && queue.length > 0) {
    const hasCompleted = queue.some((item) => item.status === "completed");

    return (
      <div className="queue-card">
        <div className="queue-header">
          <div>
            <h2>Conversion Queue</h2>
            <p className="queue-description">
              {queue.length === 0 ? "No files in queue" : `${queue.length} file(s)`}
            </p>
          </div>
          {hasCompleted && onClearCompleted && (
            <button onClick={onClearCompleted} className="clear-completed-btn">
              Clear Completed
            </button>
          )}
        </div>
        <div className="queue-content">
          {queue.length === 0 ? (
            <div className="empty-queue">
              <Clock className="empty-icon" />
              <p>Queue is empty. Upload a file to get started.</p>
            </div>
          ) : (
            <div className="file-list">
              {queue.map((item) => (
                <div key={item.id} className="file-item">
                  {/* Header */}
                  <div className="file-header">
                    <div className="file-info">
                      {getStatusIcon(item.status)}
                      <div className="file-details">
                        <p className="file-name">{item.fileName}</p>
                        {item.outputLocation && (
                          <p className="output-location">→ {item.outputLocation}</p>
                        )}
                      </div>
                    </div>
                    {onRemove && (
                      <button onClick={() => onRemove(item.id)} className="remove-btn">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="progress-section">
                    <div className="progress-bar-container">
                      <div
                        className={`progress-bar-fill status-${item.status}`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <div className="progress-info">
                      <span className="progress-percent">{Math.round(item.progress)}%</span>
                      <span className="status-label">{getStatusLabel(item.status)}</span>
                    </div>
                  </div>

                  {/* Error Message */}
                  {item.status === "error" && item.errorMessage && (
                    <p className="error-message">{item.errorMessage}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Original file-based queue UI (fallback)
  if (!files || files.length === 0) {
    return (
      <div className="queue-card">
        <div className="queue-header">
          <h2>Conversion Queue</h2>
          <p className="queue-description">No files selected</p>
        </div>
        <div className="queue-content">
          <div className="empty-queue">
            <Clock className="empty-icon" />
            <p>Queue is empty. Upload a file to get started.</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate progress based on status
  const getFileStatus = (fileName) => {
    if (!status) return 'pending';
    if (status.status === 'completed') return 'completed';
    if (status.status === 'converting') return 'converting';
    if (status.status === 'failed') return 'failed';
    return 'pending';
  };

  return (
    <div className="queue-card">
      <div className="queue-header">
        <h2>Conversion Queue</h2>
        <p className="queue-description">{files.length} file(s)</p>
      </div>
      <div className="queue-content">
        <div className="file-list">
          {files.map((file, index) => {
            const fileName = file.name || file;
            const fileStatus = getFileStatus(fileName);
            const progress = fileStatus === 'completed' ? 100 : 
                            fileStatus === 'converting' ? 50 : 0;
            
            return (
              <div key={index} className="file-item">
                <div className="file-header">
                  <div className="file-info">
                    {getStatusIcon(fileStatus)}
                    <span className="file-name">{fileName}</span>
                  </div>
                  <span className={`file-status status-${fileStatus}`}>
                    {fileStatus === 'completed' && '✓ Complete'}
                    {fileStatus === 'converting' && `${progress}%`}
                    {fileStatus === 'pending' && 'Waiting...'}
                    {fileStatus === 'failed' && '✗ Failed'}
                  </span>
                </div>
                
                <div className="progress-bar-container">
                  <div 
                    className={`progress-bar-fill status-${fileStatus}`}
                    style={{ width: `${progress}%` }}
                  >
                    {progress > 0 && `${progress}%`}
                  </div>
                </div>
                
                {fileStatus === 'converting' && (
                  <div className="time-remaining">
                    Converting...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Queue;
