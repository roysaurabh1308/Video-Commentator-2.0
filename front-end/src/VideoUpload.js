import React, { useState, useEffect } from 'react';
import './App.css';

function VideoUpload() {
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bigText, setBigText] = useState(''); // State for big text from backend
  const [loading, setLoading] = useState(false); // State for managing loader visibility

  const flaskHost = process.env.REACT_APP_FLASK_HOST || '10.14.97.93';
  const flaskPort = process.env.REACT_APP_FLASK_PORT || '5000';
  console.log('FLASK_HOST:', process.env.REACT_APP_FLASK_HOST);
  console.log('FLASK_PORT:', process.env.REACT_APP_FLASK_PORT);
  const apiUrl = `http://${flaskHost}:${flaskPort}/upload-chunk`;

  // Function to fetch big text from the Flask backend
  const fetchBigText = () => {
    setLoading(true); // Show the loader before the request
    setBigText("");

    fetch(`http://${flaskHost}:${flaskPort}/get-big-text`)
      .then(response => response.json())
      .then(data => {
        setBigText(data.bigText); // Set the fetched text to state
        setLoading(false); // Hide the loader after the response is received
      })
      .catch(error => {
        console.error('Error fetching big text:', error);
        setLoading(false); // Hide the loader even if there's an error
      });
  };

  console.log(`${apiUrl}`)
  function handleUpload(event) {
    
    console.log('API URL:', apiUrl);
    const file = event.target.files[0];
    if (!file) return;

    const chunkSize = 2 * 1024 * 1024;  // 2MB
    const totalChunks = Math.ceil(file.size / chunkSize);
    let chunkIndex = 0;

    const uploadChunk = (chunk) => {
      const formData = new FormData();
      formData.append('file', chunk);
      formData.append('index', chunkIndex);
      formData.append('filename', file.name);

      console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunks}`);

      fetch(`http://${flaskHost}:${flaskPort}/upload-chunk`, {
        method: 'POST',
        body: formData,
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json().catch(err => {
          throw new Error('Invalid JSON: ' + err.message);
        });
      })
      .then(data => {
        console.log('Chunk upload successful', data);
        chunkIndex++;
        setProgress((chunkIndex / totalChunks) * 100);
        if (chunkIndex < totalChunks) {
          const start = chunkIndex * chunkSize;
          const end = Math.min(file.size, start + chunkSize);
          const nextChunk = file.slice(start, end);
          uploadChunk(nextChunk);
        } else {
          setCaption('All chunks uploaded successfully.');
          setUploading(false);
          // Notify the server to reassemble the chunks
          fetch(`http://${flaskHost}:${flaskPort}/reassemble-video`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename: file.name }),
          })
          .then(response => {
            if (!response.ok) {
              throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json().catch(err => {
              throw new Error('Invalid JSON: ' + err.message);
            });
          })
          .then(data => {
            console.log('Reassembly successful', data);
            setCaption('Video reassembled successfully.');
            // Fetch the big text from the backend after successful upload
            fetchBigText();
          })
          .catch(error => {
            console.error('Error reassembling video:', error);
            setCaption('Failed to reassemble video.');
          });
        }
      })
      .catch(error => {
        console.error('Error uploading chunk:', error);
        setCaption('Failed to upload chunks.');
        setUploading(false);
      });
    };

    console.log("Called");
    // Start uploading the first chunk
    setUploading(true);
    const start = chunkIndex * chunkSize;
    const end = Math.min(file.size, start + chunkSize);
    const firstChunk = file.slice(start, end);
    uploadChunk(firstChunk);
  }

  return (
    <div>
      <h1>Upload Video</h1>
      <input type="file" accept="video/*" onChange={handleUpload} disabled={uploading} />
      {uploading && <div className="progress" style={{ '--progress': `${progress}%` }}></div>}
      {caption && <div className="caption">{caption}</div>}
      
      {/* Show loader during bigText fetch */}
      {loading && <div className="loader">Loading...</div>}
      
      {/* Display Big Text from Backend */}
      <h3>Caption:</h3>
      <div style={{ fontSize: '32px', marginTop: '20px' }}>
        {bigText}
      </div>
    </div>
  );
}

export default VideoUpload;
