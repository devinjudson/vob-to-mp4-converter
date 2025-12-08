import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

function ConversionStatus({ jobId }) {
  const [status, setStatus] = useState(null);

  const checkStatus = async () => {
    try {
      const response = await fetch(`http://localhost:8000/convert/status/${jobId}`);
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Status check failed:', error);
    }
  };

  useEffect(() => {
    if (jobId && (!status || (status.status !== 'completed' && status.status !== 'failed'))) {
      checkStatus();
      const interval = setInterval(checkStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [jobId, status?.status]);

  if (!status) return null;

  return (
    <Card className="conversion-status">
      <CardHeader>
        <CardTitle>Conversion Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="status-info">
          <p><strong>Job ID:</strong> {jobId}</p>
          <p><strong>Status:</strong> {status.status}</p>
          {status.output_path && (
            <p><strong>Output Location:</strong> {status.output_path}</p>
          )}
        </div>

        {status.status === 'converting' && (
          <div className="converting">
            <p>Converting videos...</p>
            <p>Please wait, this may take a few minutes</p>
          </div>
        )}

        {status.status === 'completed' && status.output_files && (
          <div className="completed">
            <h3>Conversion Complete!</h3>
            <div className="output-location">
              <p><strong>Files saved to:</strong></p>
              <p>{status.output_path}</p>
            </div>
            <ul className="file-list">
              {status.output_files.map((file, index) => (
                <li key={index}>✓ {file}</li>
              ))}
            </ul>
          </div>
        )}

        {status.status === 'failed' && (
          <div className="error">
            <p><strong>Conversion Failed</strong></p>
            <p>{status.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ConversionStatus;