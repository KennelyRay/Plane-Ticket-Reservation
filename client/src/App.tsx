import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './components/layouts/MainLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import Landing from './pages/Landing/Landing';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import FlightSearch from './pages/Flights/FlightSearch';
import SeatSelection from './pages/Booking/SeatSelection';
import PassengerDetails from './pages/Booking/PassengerDetails';
import BookingDetail from './pages/Booking/BookingDetail';
import Payment from './pages/Booking/Payment';
import MyBookings from './pages/Booking/MyBookings';
import CheckIn from './pages/Booking/CheckIn';
import Dashboard from './pages/Dashboard/Dashboard';
import AdminDashboard from './pages/Admin/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Public browsing, but admins are bounced to their console */}
          <Route element={<ProtectedRoute denyRoles={['ADMIN']} allowGuests />}>
            <Route path="/flights" element={<FlightSearch />} />
          </Route>

          <Route element={<ProtectedRoute denyRoles={['ADMIN']} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/flights/:flightId/seats" element={<SeatSelection />} />
            <Route path="/flights/:flightId/passengers" element={<PassengerDetails />} />
            <Route path="/bookings" element={<MyBookings />} />
            <Route path="/bookings/:bookingId" element={<BookingDetail />} />
            <Route path="/bookings/:bookingId/pay" element={<Payment />} />
            <Route path="/check-in" element={<CheckIn />} />
          </Route>

          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
