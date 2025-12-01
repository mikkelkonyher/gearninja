
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { LoginPage } from './pages/auth/LoginPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          {/* Placeholder for category routes */}
          <Route path="/category/:slug" element={<div className="text-center py-20 text-2xl text-muted-foreground">Kategori side kommer snart...</div>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
