import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import ConversionStatus from './components/ConversionStatus';
import './App.css';

function App() {
  const [jobId, setJobId] = useState(null);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎥 VOB to MP4 Converter</h1>
      </header>
      
      <main>
        <FileUpload onUploadComplete={setJobId} />
        {jobId && <ConversionStatus jobId={jobId} />}
      </main>
    </div>
  );
}

export default App;
