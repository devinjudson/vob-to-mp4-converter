import uvicorn
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import List, Optional
from pathlib import Path
import shutil
import uuid

from convert import convert_videos # Import the convert_videos function
    
app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:3000",
]

# Configure CORS to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store conversion job statuses
conversion_jobs = {}

# Create temp directories
UPLOAD_DIR = Path("./uploads")
OUTPUT_DIR = Path("./outputs")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

@app.get("/")
def read_root():
    return {"message": "Video Converter API"}

@app.post("/convert/upload")
async def upload_videos(
    files: List[UploadFile] = File(...),
    output_path: Optional[str] = Form(None)
):
    """Upload VOB files for conversion"""
    job_id = str(uuid.uuid4())
    job_dir = UPLOAD_DIR / job_id
    job_dir.mkdir(exist_ok=True)
    
    uploaded_files = []
    for file in files:
        if file.filename.lower().endswith('.vob'):
            file_path = job_dir / file.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            uploaded_files.append(file.filename)
    
    # Use custom output path or default
    if output_path and output_path.strip():
        custom_output = Path(output_path.strip())
        try:
            custom_output.mkdir(parents=True, exist_ok=True)
            output_location = str(custom_output.absolute())
        except Exception as e:
            print(f"Error creating custom output path: {e}")
            output_location = str((OUTPUT_DIR / job_id).absolute())
            (OUTPUT_DIR / job_id).mkdir(exist_ok=True)
    else:
        output_location = str((OUTPUT_DIR / job_id).absolute())
        (OUTPUT_DIR / job_id).mkdir(exist_ok=True)
    
    conversion_jobs[job_id] = {
        "status": "uploaded",
        "files": uploaded_files,
        "output_files": [],
        "output_path": output_location
    }
    
    print(f"Job {job_id}: Files will be converted to {output_location}")
    
    return {
        "job_id": job_id, 
        "uploaded_files": len(uploaded_files), 
        "files": uploaded_files,
        "output_path": output_location
    }

@app.post("/convert/start/{job_id}")
async def start_conversion(job_id: str, background_tasks: BackgroundTasks):
    """Start converting uploaded files"""
    if job_id not in conversion_jobs:
        return {"error": "Job not found"}
    
    job = conversion_jobs[job_id]
    if job["status"] == "converting":
        return {"error": "Job already converting"}
    
    job["status"] = "converting"
    
    # Run conversion in background
    input_dir = UPLOAD_DIR / job_id
    output_location = job["output_path"]
    
    print(f"Starting conversion for job {job_id}")
    print(f"Input: {input_dir}")
    print(f"Output: {output_location}")
    
    background_tasks.add_task(run_conversion, job_id, str(input_dir), output_location)
    
    return {"job_id": job_id, "status": "converting", "output_path": output_location}

# Background task to run conversion
def run_conversion(job_id: str, input_path: str, output_path: str):
    """Background task to convert videos"""
    try:
        print(f"\n=== Starting conversion for job {job_id} ===")
        print(f"Input path: {input_path}")
        print(f"Output path: {output_path}")
        
        convert_videos(input_path, output_path)
        
        # Update job status
        output_files = list(Path(output_path).glob("*.mp4"))
        conversion_jobs[job_id]["status"] = "completed"
        conversion_jobs[job_id]["output_files"] = [f.name for f in output_files]
        
        print(f"=== Completed conversion for job {job_id} ===")
        print(f"Output files: {[f.name for f in output_files]}")
        print()
    except Exception as e:
        conversion_jobs[job_id]["status"] = "failed"
        conversion_jobs[job_id]["error"] = str(e)
        print(f"=== Failed conversion for job {job_id}: {str(e)} ===\n")

# Check conversion status
@app.get("/convert/status/{job_id}")
def get_conversion_status(job_id: str):
    """Check conversion status"""
    if job_id not in conversion_jobs:
        return {"error": "Job not found"}
    
    return conversion_jobs[job_id]

# Download converted file
@app.get("/convert/download/{job_id}/{filename}")
def download_file(job_id: str, filename: str):
    """Download converted file"""
    file_path = OUTPUT_DIR / job_id / filename
    if not file_path.exists():
        return {"error": "File not found"}
    
    return FileResponse(file_path, media_type="video/mp4", filename=filename)

# List all conversion jobs
@app.get("/convert/jobs")
def list_jobs():
    """List all conversion jobs"""
    return conversion_jobs

# Run the app
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")  # Only show warnings and errors
