import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function LiveStream() {
  const [streamUrl, setStreamUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processedFrameUrl, setProcessedFrameUrl] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const flaskHost = process.env.REACT_APP_FLASK_HOST || '10.14.97.93';
  const flaskPort = process.env.REACT_APP_FLASK_PORT || '5000';
  console.log('FLASK_HOST:', process.env.REACT_APP_FLASK_HOST);
  console.log('FLASK_PORT:', process.env.REACT_APP_FLASK_PORT);

  // Function to access the user's camera
  async function handleStartCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing the camera:', error);
      setError('Error accessing the camera');
    }
  }

  // Function to update the stream URL state
  function handleLinkChange(event) {
    setStreamUrl(event.target.value);
    setError(null);  // Clear any previous error
  }

  // Function to load the video stream from the URL
  function handleLoadStream() {
    if (videoRef.current) {
      setLoading(true);
      videoRef.current.src = streamUrl;
      videoRef.current.load();
      videoRef.current.onloadeddata = () => {
        setLoading(false);
        setError(null);  // Clear any previous error
        captureFrames();
      };
      videoRef.current.onerror = () => {
        setLoading(false);
        setError('Error loading video from URL');
      };
    }
  }

  // Function to capture frames from the video
  function captureFrames() {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      const captureInterval = 1000; // Capture frame every second

      const capture = () => {
        if (videoRef.current.paused || videoRef.current.ended) {
          return;
        }
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasRef.current.toBlob(sendFrameToBackend, 'image/jpeg');
        setTimeout(capture, captureInterval);
      };

      capture();
    }
  }

  // Function to send frame to the backend
  async function sendFrameToBackend(blob) {
    const formData = new FormData();
    formData.append('frame', blob);

    try {
      const response = await fetch(`http://${flaskHost}:${flaskPort}/process-frame`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const blobResponse = await response.blob();
      const objectUrl = URL.createObjectURL(blobResponse);
      setProcessedFrameUrl(objectUrl);
    } catch (error) {
      console.error('Error sending frame to backend:', error);
    }
  }

  // Cleanup function to stop the camera when the component unmounts
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="live-stream-container">
      <h1>Live Video Stream</h1>
      <div className="input-container">
        <input
          type="text"
          value={streamUrl}
          onChange={handleLinkChange}
          placeholder="Enter streaming URL (e.g., http://example.com/stream.m3u8)"
        />
        <button onClick={handleLoadStream} disabled={loading}>Load Stream</button>
      </div>
      <div className="button-container">
        <button onClick={handleStartCamera}>Access Camera</button>
      </div>
      {loading && <div>Loading video...</div>}
      {error && <div className="error">{error}</div>}
      <video
        ref={videoRef}
        autoPlay={true}
        controls={true}
        style={{ display: 'none' }}
      />
      <canvas ref={canvasRef} width="640" height="480" style={{ display: 'none' }}></canvas>
      {processedFrameUrl && (
        <div>
          <h2>Processed Frame</h2>
          <img src={processedFrameUrl} alt="Processed Frame" />
        </div>
      )}
    </div>
  );
}

export default LiveStream;
