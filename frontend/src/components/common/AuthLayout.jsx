import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import Logo from './Logo';

const highlights = [
  'Catalogue et panier persistant',
  'Paiement sécurisé via Stripe',
  'Veille concurrentielle automatisée',
  'Prédictions de ventes par IA',
];

/**
 * Écran scindé : panneau de marque à gauche (masqué sur mobile),
 * formulaire à droite.
 */
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <Box sx={{ flexGrow: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '5fr 6fr' } }}>
      {/* Panneau de marque */}
      <Box
        className="hero-mesh"
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          color: '#fff',
        }}
      >
        <Box component={RouterLink} to="/" sx={{ textDecoration: 'none' }}>
          <Logo variant="light" />
        </Box>

        <Box sx={{ maxWidth: 400 }}>
          <Typography variant="h3" sx={{ fontSize: '1.9rem', lineHeight: 1.25 }}>
            Vendez plus intelligemment que vos concurrents.
          </Typography>
          <Box className="flex flex-col" sx={{ gap: 1.75, mt: 4 }}>
            {highlights.map((item) => (
              <Box key={item} className="flex items-center" sx={{ gap: 1.5 }}>
                <CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#818CF8' }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.78)', fontSize: 15 }}>{item}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
          © {new Date().getFullYear()} Novacart
        </Typography>
      </Box>

      {/* Formulaire */}
      <Box
        className="flex items-center justify-center anim-fade-up"
        sx={{ p: { xs: 3, sm: 6 }, py: { xs: 6 } }}
      >
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '1.9rem' } }}>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, mb: 4 }}>
            {subtitle}
          </Typography>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
