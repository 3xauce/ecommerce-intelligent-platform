import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';

export default function NotFoundPage() {
  return (
    <Container maxWidth="sm" className="anim-fade-up flex flex-col items-center justify-center text-center" sx={{ flexGrow: 1, py: 12 }}>
      <Typography
        className="text-gradient"
        sx={{ fontSize: { xs: '6rem', md: '8rem' }, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.04em' }}
      >
        404
      </Typography>
      <Typography variant="h4" sx={{ mt: 2, fontSize: { xs: '1.4rem', md: '1.7rem' } }}>
        Cette page n&apos;existe pas
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, maxWidth: 380 }}>
        La page que vous cherchez a peut-être été déplacée ou n&apos;a jamais existé.
      </Typography>
      <Box sx={{ mt: 4 }}>
        <Button component={RouterLink} to="/" variant="contained" size="large" startIcon={<ArrowBackRoundedIcon />}>
          Retour à l&apos;accueil
        </Button>
      </Box>
    </Container>
  );
}
