import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AlertHistory from './components/AlertHistory';
import ExamRoom from './components/ExamRoom';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="container-fluid py-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/alerts" element={<AlertHistory />} />
            <Route path="/room" element={<ExamRoom />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;