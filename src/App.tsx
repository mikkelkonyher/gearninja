
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
          <Route path="/trommer" element={<TrommerPage />} />
          <Route path="/guitar" element={<GuitarPage />} />
          <Route path="/bas" element={<BasPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          {/* Placeholder for category routes */}
          <Route path="/category/:slug" element={<div className="text-center py-20 text-2xl text-muted-foreground">Kategori side kommer snart...</div>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
