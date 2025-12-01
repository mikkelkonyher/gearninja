
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { LoginPage } from './pages/auth/LoginPage';
import { CreateAnnouncementPage } from './pages/CreateAnnouncementPage';
import { CreateTrommerPage } from './pages/CreateTrommerPage';
import { TrommerPage } from './pages/TrommerPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CreateGuitarPage } from './pages/CreateGuitarPage';
import { GuitarPage } from './pages/GuitarPage';
import { CreateBasPage } from './pages/CreateBasPage';
import { BasPage } from './pages/BasPage';
import { CreateKeyboardsPage } from './pages/CreateKeyboardsPage';
import { KeyboardsPage } from './pages/KeyboardsPage';
import { CreateBlaesPage } from './pages/CreateBlaesPage';
import { BlaesPage } from './pages/BlaesPage';
import { CreateStudieudstyrPage } from './pages/CreateStudieudstyrPage';
import { StudieudstyrPage } from './pages/StudieudstyrPage';
import { CreateStrygerePage } from './pages/CreateStrygerePage';
import { StrygerePage } from './pages/StrygerePage';
import { ProfilePage } from './pages/ProfilePage';
import { MineAnnoncerPage } from './pages/MineAnnoncerPage';
import { FavoritterPage } from './pages/FavoritterPage';
import { FoelgerePage } from './pages/FoelgerePage';
import { IndstillingerPage } from './pages/IndstillingerPage';
import { SearchResultsPage } from './pages/SearchResultsPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/create" element={<CreateAnnouncementPage />} />
          <Route path="/create/trommer" element={<CreateTrommerPage />} />
          <Route path="/create/guitar" element={<CreateGuitarPage />} />
          <Route path="/create/bas" element={<CreateBasPage />} />
          <Route path="/create/keyboards" element={<CreateKeyboardsPage />} />
          <Route path="/create/blaes" element={<CreateBlaesPage />} />
          <Route path="/create/studieudstyr" element={<CreateStudieudstyrPage />} />
          <Route path="/create/strygere" element={<CreateStrygerePage />} />
          <Route path="/trommer" element={<TrommerPage />} />
          <Route path="/guitar" element={<GuitarPage />} />
          <Route path="/bas" element={<BasPage />} />
          <Route path="/keyboards" element={<KeyboardsPage />} />
          <Route path="/blaes" element={<BlaesPage />} />
          <Route path="/studieudstyr" element={<StudieudstyrPage />} />
          <Route path="/strygere" element={<StrygerePage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/mine-annoncer" element={<MineAnnoncerPage />} />
          <Route path="/favoritter" element={<FavoritterPage />} />
          <Route path="/foelgere" element={<FoelgerePage />} />
          <Route path="/indstillinger" element={<IndstillingerPage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          {/* Placeholder for category routes */}
          <Route path="/category/:slug" element={<div className="text-center py-20 text-2xl text-muted-foreground">Kategori side kommer snart...</div>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
