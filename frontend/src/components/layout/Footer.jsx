import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Logo from '../common/Logo';
import { tokens } from '../../theme/muiTheme';

const footerLinks = [
  {
    title: 'Plateforme',
    links: [
      { label: 'Accueil', to: '/' },
      { label: 'Produits', to: '/products' },
      { label: 'Créer un compte', to: '/register' },
    ],
  },
  {
    title: 'Modules',
    links: [
      { label: 'Boutique en ligne', to: '/products' },
      { label: 'Analyse concurrentielle', to: '/' },
      { label: 'Prédictions IA', to: '/' },
    ],
  },
];

export default function Footer() {
  return (
    <Box component="footer" sx={{ backgroundColor: tokens.ink, color: 'rgba(255,255,255,0.72)', mt: 'auto' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Grid container spacing={6}>
          <Grid item xs={12} md={5}>
            <Logo variant="light" />
            <Typography variant="body2" sx={{ mt: 2.5, maxWidth: 340, color: 'rgba(255,255,255,0.6)' }}>
              La plateforme e-commerce qui vend pour vous et surveille vos concurrents —
              catalogue, paiement, scraping et intelligence artificielle réunis.
            </Typography>
          </Grid>

          {footerLinks.map((column) => (
            <Grid item xs={6} md={2.5} key={column.title}>
              <Typography
                variant="overline"
                sx={{ color: 'rgba(255,255,255,0.45)', display: 'block', mb: 1.5 }}
              >
                {column.title}
              </Typography>
              <Box className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <Link
                    key={link.label}
                    component={RouterLink}
                    to={link.to}
                    underline="none"
                    sx={{
                      color: 'rgba(255,255,255,0.72)',
                      fontSize: 14,
                      transition: 'color 160ms ease',
                      '&:hover': { color: '#fff' },
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </Box>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.08)' }} />

        <Box className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)' }}>
            © {new Date().getFullYear()} Novacart — Projet de Fin d&apos;Études, KAYA ALDJOUMA.
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)' }}>
            Plateforme E-Commerce Intelligente
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
