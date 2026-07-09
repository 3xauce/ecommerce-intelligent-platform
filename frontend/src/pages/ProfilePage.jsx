import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import { useAuth } from '../hooks/useAuth';
import { tokens } from '../theme/muiTheme';

const roleLabels = {
  admin: 'Administrateur',
  vendeur: 'Vendeur',
  client: 'Client',
};

function InfoRow({ icon: Icon, label, children }) {
  return (
    <Box className="flex items-center" sx={{ gap: 2, py: 2 }}>
      <Box
        className="flex items-center justify-center shrink-0"
        sx={{
          width: 40,
          height: 40,
          borderRadius: '12px',
          backgroundColor: 'rgba(79, 70, 229, 0.08)',
        }}
      >
        <Icon sx={{ fontSize: 20, color: tokens.primary }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography sx={{ fontWeight: 600 }} noWrap>
          {children}
        </Typography>
      </Box>
    </Box>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }} className="anim-fade-up">
      <Card sx={{ overflow: 'hidden' }}>
        {/* Bandeau dégradé */}
        <Box className="hero-mesh" sx={{ height: 110 }} />

        <Box sx={{ px: { xs: 3, sm: 4 }, pb: 4 }}>
          <Avatar
            sx={{
              width: 84,
              height: 84,
              mt: '-42px',
              fontSize: 30,
              fontWeight: 800,
              backgroundImage: tokens.gradient,
              border: '4px solid #fff',
              boxShadow: '0 8px 20px rgba(15, 23, 42, 0.15)',
            }}
          >
            {user.first_name?.[0]?.toUpperCase()}
            {user.last_name?.[0]?.toUpperCase()}
          </Avatar>

          <Box className="flex flex-wrap items-center" sx={{ gap: 1.5, mt: 2 }}>
            <Typography variant="h4" sx={{ fontSize: { xs: '1.4rem', md: '1.7rem' } }}>
              {user.first_name} {user.last_name}
            </Typography>
            <Chip
              size="small"
              label={roleLabels[user.role] || user.role}
              sx={{ backgroundImage: tokens.gradient, color: '#fff' }}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          <InfoRow icon={MailOutlineRoundedIcon} label="Adresse email">
            {user.email}
          </InfoRow>
          <InfoRow icon={VerifiedUserRoundedIcon} label="Statut du compte">
            {user.is_active ? 'Actif' : 'Désactivé'}
          </InfoRow>
          <InfoRow icon={CalendarMonthRoundedIcon} label="Membre depuis">
            {memberSince}
          </InfoRow>
        </Box>
      </Card>
    </Container>
  );
}
