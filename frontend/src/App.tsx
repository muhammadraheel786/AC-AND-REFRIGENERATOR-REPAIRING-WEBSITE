import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Services from './pages/Services'
import Book from './pages/Book'
import Contact from './pages/Contact'
import Login from './pages/Login'
import MyBookings from './pages/MyBookings'
import BookingStatus from './pages/BookingStatus'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/book" element={<Book />} />
        <Route path="/book/status" element={<BookingStatus />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/my-bookings" element={<MyBookings />} />
      </Routes>
    </Layout>
  )
}

export default App
