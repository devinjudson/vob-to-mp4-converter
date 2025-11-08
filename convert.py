import ffmpeg
import os
from tqdm import tqdm
import subprocess
import threading

# ffmpeg installation location
FFMPEG_PATH = r'C:/ffmpeg/ffmpeg.exe'
FFPROBE_PATH = r'C:/ffmpeg/ffprobe.exe'

def convert_vob_to_mp4(input_file, output_file):
    try:
        if not output_file: # If no output file specified
            raise ValueError("No output file specified.") # Raise error for missing output file

        if os.path.exists(output_file): # If output file already exists
            raise FileExistsError(f"Output file '{output_file}' already exists.") # Prevent overwriting existing files
        
        # Get duration of input file for progress tracking
        probe = ffmpeg.probe(input_file, cmd=FFPROBE_PATH)
        duration = float(probe['format']['duration'])
        print(f"Total duration: {duration:.1f}s")
        
        # Build ffmpeg command
        stream = (
            ffmpeg
            .input(
                input_file,
                fflags="+genpts", # Generate presentation timestamps
                analyzeduration=10_000_000 # 10 seconds
            )
            .output(
                output_file, 
                vcodec="libx264", # Use H.264 codec for video
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
                    bar_format='{l_bar}{bar}| {n:.1f}/{total:.1f}s [{elapsed}<{remaining}]')
        
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
            print(f"Converted successfully: {output_file}")
        else:
            stderr_output = ''.join(stderr_lines)
            print(f"Error: {stderr_output}")
            raise Exception("Conversion failed")
        
    except FileExistsError as e:
        print(e) # Print file exists error message

    except ValueError as e:
        print(e) # Print value error message

    except ffmpeg.Error as e:
        print("Error converting video.")
        print(e.stderr.decode() if e.stderr else str(e)) # Print ffmpeg error message

input_file = "F:/VIDEO_TS/VTS_01_1.VOB"
output_file = "E:/Home Videos/test2/output4.mp4"
convert_vob_to_mp4(input_file, output_file) # Call the conversion function