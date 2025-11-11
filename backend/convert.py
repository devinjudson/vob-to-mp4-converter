import ffmpeg
import os
from tqdm import tqdm
import subprocess
import threading
from pathlib import Path

# ffmpeg installation location
FFMPEG_PATH = r'C:/ffmpeg/ffmpeg.exe'
FFPROBE_PATH = r'C:/ffmpeg/ffprobe.exe'

def convert_videos(input_path, output_path):
    
    input_path = Path(input_path)
    output_path = Path(output_path)
    
    # Create output directory if it doesn't exist (for batch mode)
    if input_path.is_dir():
        output_path.mkdir(parents=True, exist_ok=True)
    
    # Determine what we're processing
    files_to_convert = []
    
    if input_path.is_file(): # If input is a file
        files_to_convert.append((input_path, output_path))
    elif input_path.is_dir(): # If input is a directory
        print(f"Scanning directory: {input_path}\n")
        
        # Find all VOB files (case-insensitive)
        for file in input_path.iterdir():
            if file.suffix.lower() == '.vob' and file.is_file():
                # Skip tiny VOB files (usually menus/placeholders under 1MB)
                if file.stat().st_size < 1_000_000:
                    print(f"Skipping: {file.name} (only {file.stat().st_size / 1024:.0f} KB)")
                    continue
                output_file = output_path / (file.stem + '.mp4') # Change extension to .mp4
                files_to_convert.append((file, output_file))
                print(f"Will convert: {file.name}")

    if not files_to_convert: # If no files to convert
        raise ValueError("No files to convert.") # Raise error for no files
    
    print(f"Found {len(files_to_convert)} file(s) to convert\n")

    for input_file, output_file in files_to_convert:
        if os.path.exists(output_file): # If output file already exists
            raise FileExistsError(f"Output file '{output_file}' already exists.") # Prevent overwriting existing files
        
    # Process each file
    for i, (input_file, output_file) in enumerate(files_to_convert, 1): # For each file
        print(f"[{i}/{len(files_to_convert)}] Processing: {input_file.name}")
        
        try:
            if output_file.exists():
                print(f"Skipping: Output file '{output_file}' already exists.\n") # Skip if output file already exists
                continue

            # Get duration of input file for progress tracking
            probe = ffmpeg.probe(input_file, cmd=FFPROBE_PATH)
            duration = float(probe['format']['duration'])
            print(f"Total duration: {duration:.1f}s")
            
            # Build ffmpeg command
            stream = (
                ffmpeg
                .input(
                    str(input_file),
                    fflags="+genpts", # Generate presentation timestamps
                    analyzeduration=10_000_000 # 10 seconds
                )
                .output(
                    str(output_file), 
                    vcodec="h264_nvenc", # Use NVIDIA hardware acceleration for video
                    acodec="aac", # Use AAC codec for audio
                    preset="medium", # Preset for encoding speed vs quality
                    crf=23, # Constant Rate Factor for quality
                    movflags="+faststart" # Optimize for web streaming
                )
            )
            
            # Get the command
            cmd = ffmpeg.compile(stream, cmd=FFMPEG_PATH, overwrite_output=True)
            
            # Run with progress tracking
            process = subprocess.Popen(
                cmd + ['-progress', 'pipe:1', '-nostats'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True,
                bufsize=1
            )
            
            # Create progress bar
            pbar = tqdm(total=duration, unit='s', desc='Converting', 
                        bar_format='{l_bar}{bar}| {n:.1f} / {total:.1f}s [{elapsed}]')
            
            prev_time = 0
            stderr_lines = []
            
            # Thread to consume stderr to prevent blocking
            def read_stderr():
                for line in process.stderr:
                    stderr_lines.append(line)
            
            stderr_thread = threading.Thread(target=read_stderr, daemon=True)
            stderr_thread.start()
            
            # Read stdout for progress
            while True:
                line = process.stdout.readline()
                if not line and process.poll() is not None:
                    break
                if line:
                    line = line.strip()
                    if line.startswith('out_time_ms='):
                        try:
                            time_ms = int(line.split('=')[1])
                            time_s = time_ms / 1_000_000
                            if time_s > prev_time:
                                pbar.update(time_s - prev_time)
                                prev_time = time_s
                        except (ValueError, IndexError):
                            pass
            
            process.wait()
            pbar.close()
            
            print()  # New line after progress
            if process.returncode == 0:
                print(f"Converted successfully: {output_file}\n")
            else:
                stderr_output = ''.join(stderr_lines)
                print(f"Error: {stderr_output}\n")
            
        except Exception as e:
            print(f"Error converting {input_file.name}: {str(e)}\n")

# Single file conversion:
# convert_videos("F:/VIDEO_TS/VTS_01_1.VOB", "E:/Home Videos/output.mp4")

# Batch folder conversion:
# Replace F: with your actual DVD drive letter (D:, E:, F:, etc.)
# convert_videos("F:/VIDEO_TS", "E:/Home Videos/test4")