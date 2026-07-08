import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './components/layouts/MainLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import FlightSearch from './pages/Flights/FlightSearch';
import SeatSelection from './pages/Booking/SeatSelection';
import Dashboard from './pages/Dashboard/Dashboard';
import AdminDashboard from './pages/Admin/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/flights" replace />} />
          <Route path="/flights" element={<FlightSearch />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/flights/:flightId/seats" element={<SeatSelection />} />
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
