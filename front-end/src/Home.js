import React, { useState } from 'react';
import './App.css';

function Home() {
    const [response, setResponse] = useState('');
    const flaskHost = process.env.REACT_APP_FLASK_HOST || 'localhost';
    const flaskPort = process.env.REACT_APP_FLASK_PORT || '5000';
    const apiUrl1 = `http://${flaskHost}:${flaskPort}/`;
    const apiUrl = 'http://10.14.97.93:5000'
    function checkHealth(event) {
    console.log('API URL:', apiUrl);

    fetch(apiUrl)
      .then(res => {
        if (!res.ok) {
          throw new Error('Network response was not ok');
        }
        return res.json(); // Assuming the server responds with JSON
      })
      .then(data => {
        console.log('Response:', data);
        setResponse(JSON.stringify(data)); // Update state with the response to display in the UI
      })
      .catch(error => {
        console.error('Fetch error:', error);
        setResponse('Failed to fetch data'); // Handle errors
      });
  }

  return (
    <div>
        <h1>Home</h1>
        <button onClick={checkHealth}>Check Health</button>
        <p>Server Response: {response}</p> 
    </div>
  );
}

export default Home;
