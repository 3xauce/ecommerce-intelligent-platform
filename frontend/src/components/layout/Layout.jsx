import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import Navbar from './Navbar';
import Footer from './Footer';
import ChatbotWidget from '../common/ChatbotWidget';

/**
 * Les pages gèrent elles-mêmes leur largeur (Container ou pleine largeur),
 * ce qui permet les sections full-bleed comme le hero de l'accueil.
 */
export default function Layout() {
  return (
    <Box className="flex flex-col" sx={{ minHeight: '100vh' }}>
      <Navbar />
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </Box>
      <Footer />
      <ChatbotWidget />
    </Box>
  );
}
