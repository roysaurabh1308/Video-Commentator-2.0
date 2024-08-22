import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import VideoUpload from './VideoUpload';
import LiveStream from './LiveStream';
import Home from './Home';
import './App.css';

function App() {
  return (
    <Router>
      <div>
        <nav>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/upload">Upload Video</Link>
            </li>
            <li>
              <Link to="/live">Live Stream</Link>
            </li>
          </ul>
        </nav>

        <div className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/upload" element={<VideoUpload />} />
            <Route path="/live" element={<LiveStream />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
