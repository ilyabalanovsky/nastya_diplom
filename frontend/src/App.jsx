import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import Students from './pages/Students'
import Courses from './pages/Courses'
import Streams from './pages/Streams'
import Documents from './pages/Documents'
import './App.css'

function Navbar() {
  const location = useLocation()
  
  return (
    <nav className="navbar">
      <div className="navbar-content">
        <h1>Управление курсами вуза</h1>
        <div className="navbar-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Студенты
          </Link>
          <Link to="/courses" className={location.pathname === '/courses' ? 'active' : ''}>
            Курсы
          </Link>
          <Link to="/streams" className={location.pathname === '/streams' ? 'active' : ''}>
            Потоки
          </Link>
          <Link to="/documents" className={location.pathname === '/documents' ? 'active' : ''}>
            Документы
          </Link>
        </div>
      </div>
    </nav>
  )
}

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Students />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/streams" element={<Streams />} />
        <Route path="/documents" element={<Documents />} />
      </Routes>
    </Router>
  )
}

export default App
