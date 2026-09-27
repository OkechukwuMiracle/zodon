import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Investigation from './pages/Investigation.jsx';
import Report from './pages/Report.jsx';
import History from './pages/History.jsx';
import About from './pages/About.jsx';
import NotFound from './pages/NotFound.jsx';
import { InvestigationProvider } from './hooks/InvestigationContext.jsx';
import { ToastProvider } from './components/common/ToastNotification.jsx';
import ScrollToTop from './components/layout/ScrollToTop.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ToastProvider>
        <InvestigationProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="investigate" element={<Investigation />} />
              <Route path="report/:id" element={<Report />} />
              <Route path="history" element={<History />} />
              <Route path="about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </InvestigationProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
