
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { LoginPage } from './pages/auth/LoginPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
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
import { MineKoebPage } from './pages/MineKoebPage';
import { MineSalgPage } from './pages/MineSalgPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { FavoritterPage } from './pages/FavoritterPage';

import { IndstillingerPage } from './pages/IndstillingerPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { CreateOevelokalerPage } from './pages/CreateOevelokalerPage';
import { OevelokalerPage } from './pages/OevelokalerPage';
import { RoomDetailPage } from './pages/RoomDetailPage';
import { ChatPage } from './pages/ChatPage';
import { ChatLayout } from './layouts/ChatLayout';
import { ForumPage } from './pages/ForumPage';
import { ForumThreadPage } from './pages/ForumThreadPage';
import { CreateThreadPage } from './pages/CreateThreadPage';
import { AboutPage } from './pages/AboutPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/forgot-password" element={<ResetPasswordPage />} />
          <Route path="/create" element={<CreateAnnouncementPage />} />
          <Route path="/create/trommer" element={<CreateTrommerPage />} />
          <Route path="/create/guitar" element={<CreateGuitarPage />} />
          <Route path="/create/bas" element={<CreateBasPage />} />
          <Route path="/create/keyboards" element={<CreateKeyboardsPage />} />
          <Route path="/create/blaes" element={<CreateBlaesPage />} />
          <Route path="/create/studieudstyr" element={<CreateStudieudstyrPage />} />
          <Route path="/create/strygere" element={<CreateStrygerePage />} />
          <Route path="/create/oevelokaler" element={<CreateOevelokalerPage />} />
          <Route path="/trommer" element={<TrommerPage />} />
          <Route path="/guitar" element={<GuitarPage />} />
          <Route path="/bas" element={<BasPage />} />
          <Route path="/keyboards" element={<KeyboardsPage />} />
          <Route path="/blaes" element={<BlaesPage />} />
          <Route path="/studieudstyr" element={<StudieudstyrPage />} />
          <Route path="/strygere" element={<StrygerePage />} />
          <Route path="/oevelokaler" element={<OevelokalerPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/room/:id" element={<RoomDetailPage />} />
          <Route path="/chat" element={<ChatLayout />}>
            {/* Used both for creating a new chat via query params and opening existing chats */}
            <Route index element={<ChatPage />} />
            <Route path=":chatId" element={<ChatPage />} />
          </Route>
          <Route path="/chats" element={<ChatLayout />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profil" element={<ProfilePage />} />
          <Route path="/mine-annoncer" element={<MineAnnoncerPage />} />
          <Route path="/mine-koeb" element={<MineKoebPage />} />
          <Route path="/mine-salg" element={<MineSalgPage />} />
          <Route path="/favoritter" element={<FavoritterPage />} />
          <Route path="/user/:userId" element={<UserProfilePage />} />

          <Route path="/forum" element={<ForumPage />} />
          <Route path="/forum/thread/:id" element={<ForumThreadPage />} />
          <Route path="/forum/create" element={<CreateThreadPage />} />

          <Route path="/indstillinger" element={<IndstillingerPage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/om" element={<AboutPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
