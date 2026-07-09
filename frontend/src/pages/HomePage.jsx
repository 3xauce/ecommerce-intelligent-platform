import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import QueryStatsRoundedIcon from '@mui/icons-material/QueryStatsRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import { tokens } from '../theme/muiTheme';

const features = [
  {
    icon: StorefrontRoundedIcon,
    color: '#6366F1',
    bg: 'rgba(99, 102, 241, 0.1)',
    title: 'Boutique en ligne',
    description:
      'Catalogue structuré, panier persistant et paiement Stripe sécurisé. Vendez vos produits sans friction.',
  },
  {
    icon: TravelExploreRoundedIcon,
    color: '#0EA5E9',
    bg: 'rgba(14, 165, 233, 0.1)',
    title: 'Veille concurrentielle',
    description:
      'Un moteur de scraping surveille les prix et les stocks de vos concurrents, automatiquement.',
  },
  {
    icon: PsychologyRoundedIcon,
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.1)',
    title: 'Prédictions IA',
    description:
      'Prévisions de ventes à 30, 60 et 90 jours et détection de tendances pour anticiper le marché.',
  },
  {
    icon: QueryStatsRoundedIcon,
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.12)',
    title: 'Dashboard analytique',
    description:
      'KPIs en temps réel, comparaisons de prix et rapports exportables en PDF ou CSV.',
  },
];

const stats = [
  { value: '30/60/90 j', label: 'Horizons de prévision IA' },
  { value: '> 80 %', label: 'Taux de succès du scraping' },
  { value: '3 rôles', label: 'Admin, vendeur, client' },
  { value: 'Stripe', label: 'Paiement sécurisé' },
];

export default function HomePage() {
  return (
    <>
      {/* ------------------------------------------------ Hero ---------- */}
      <Box className="hero-mesh hero-grid" sx={{ position: 'relative', color: '#fff' }}>
        <Container maxWidth="lg" sx={{ position: 'relative', pt: { xs: 10, md: 15 }, pb: { xs: 11, md: 16 } }}>
          <Box className="anim-fade-up" sx={{ maxWidth: 720 }}>
            <Chip
              icon={<BoltRoundedIcon sx={{ fontSize: 16, color: '#FCD34D !important' }} />}
              label="E-commerce + Scraping + Intelligence Artificielle"
              size="small"
              sx={{
                mb: 3.5,
                color: 'rgba(255,255,255,0.85)',
                backgroundColor: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.14)',
                backdropFilter: 'blur(4px)',
                fontWeight: 500,
              }}
            />

            <Typography
              variant="h1"
              sx={{ fontSize: { xs: '2.4rem', sm: '3.2rem', md: '3.9rem' } }}
            >
              La plateforme e-commerce intelligente qui{' '}
              <Box component="span" className="text-gradient">
                surveille vos concurrents
              </Box>
            </Typography>

            <Typography
              variant="body1"
              sx={{
                mt: 3,
                fontSize: { xs: '1.02rem', md: '1.15rem' },
                color: 'rgba(255,255,255,0.66)',
                maxWidth: 560,
              }}
            >
              Vendez en ligne, analysez les prix du marché en continu et laissez
              l&apos;intelligence artificielle guider vos décisions stratégiques —
              le tout au même endroit.
            </Typography>

            <Box className="flex flex-wrap items-center" sx={{ mt: 4.5, gap: 2 }}>
              <Button
                component={RouterLink}
                to="/products"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardRoundedIcon />}
              >
                Découvrir la boutique
              </Button>
              <Button
                component={RouterLink}
                to="/register"
                size="large"
                sx={{
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.22)',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.4)' },
                }}
              >
                Créer un compte vendeur
              </Button>
            </Box>
          </Box>

          {/* Stats */}
          <Grid container spacing={0} className="anim-fade-up anim-delay-2" sx={{ mt: { xs: 7, md: 10 } }}>
            {stats.map((stat, index) => (
              <Grid
                item
                xs={6}
                md={3}
                key={stat.label}
                sx={{
                  py: 2.5,
                  px: 3,
                  borderLeft: { md: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.1)' },
                  borderTop: { xs: index >= 2 ? '1px solid rgba(255,255,255,0.1)' : 'none', md: 'none' },
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: '1.55rem', letterSpacing: '-0.02em' }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', mt: 0.5 }}>
                  {stat.label}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ------------------------------------------- Fonctionnalités ---- */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Box sx={{ maxWidth: 560, mb: { xs: 5, md: 7 } }}>
          <Typography variant="overline" sx={{ color: tokens.primary }}>
            Modules de la plateforme
          </Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.4rem' }, mt: 1 }}>
            Tout ce qu&apos;il faut pour vendre — et pour gagner.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Grid item xs={12} sm={6} md={3} key={feature.title}>
                <Card
                  sx={{
                    height: '100%',
                    p: 0.5,
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: '0 20px 40px rgba(15, 23, 42, 0.1)',
                      borderColor: 'rgba(99, 102, 241, 0.35)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      className="flex items-center justify-center"
                      sx={{
                        width: 46,
                        height: 46,
                        borderRadius: '14px',
                        backgroundColor: feature.bg,
                        mb: 2.5,
                      }}
                    >
                      <Icon sx={{ color: feature.color, fontSize: 26 }} />
                    </Box>
                    <Typography variant="h6" gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Container>

      {/* ------------------------------------------------ CTA band ------ */}
      <Container maxWidth="lg" sx={{ pb: { xs: 8, md: 12 } }}>
        <Box
          sx={{
            borderRadius: '24px',
            backgroundImage: tokens.gradient,
            color: '#fff',
            px: { xs: 4, md: 8 },
            py: { xs: 5, md: 7 },
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 3,
            boxShadow: '0 24px 48px rgba(99, 102, 241, 0.35)',
          }}
        >
          <Box>
            <Typography variant="h3" sx={{ fontSize: { xs: '1.5rem', md: '1.9rem' } }}>
              Prêt à prendre l&apos;avantage sur votre marché ?
            </Typography>
            <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.85)' }}>
              Créez votre compte gratuitement — vendeur ou client.
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to="/register"
            size="large"
            sx={{
              backgroundColor: '#fff',
              color: tokens.primary,
              fontWeight: 700,
              px: 4,
              flexShrink: 0,
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.92)' },
            }}
          >
            Commencer maintenant
          </Button>
        </Box>
      </Container>
    </>
  );
}
