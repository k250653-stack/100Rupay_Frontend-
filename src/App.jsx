import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { IssuesProvider } from './context/IssuesContext'
import TopBar from './components/TopBar'
import BottomNav from './components/BottomNav'
import MapPage from './pages/MapPage'
import CapturePage from './pages/CapturePage'
import ReportPage from './pages/ReportPage'
import GalleryPage from './pages/GalleryPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <IssuesProvider>
          <div className="h-screen h-[100dvh] flex flex-col overflow-hidden">
            <TopBar />
            <main className="flex-1 mt-[78px] mb-[64px] overflow-hidden">
              <Routes>
                <Route path="/" element={<MapPage />} />
                <Route path="/capture" element={<CapturePage />} />
                <Route path="/report" element={<ReportPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Routes>
            </main>
            <BottomNav />
          </div>
        </IssuesProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
