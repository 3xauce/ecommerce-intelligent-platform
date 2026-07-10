import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import Logo from '../common/Logo';
import { useAuth } from '../../hooks/useAuth';
import { logoutUser } from '../../store/slices/authSlice';
import { cartReset } from '../../store/slices/cartSlice';
import { tokens } from '../../theme/muiTheme';

const baseLinks = [
  { label: 'Accueil', to: '/' },
  { label: 'Produits', to: '/products' },
];

const authLinks = [{ label: 'Mes commandes', to: '/orders' }];
const businessLinks = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'IA', to: '/ai' },
];

export default function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const itemCount = useSelector((state) => state.cart.cart.item_count);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await dispatch(logoutUser());
    dispatch(cartReset());
    navigate('/login');
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${tokens.border}`,
        color: tokens.textPrimary,
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: { xs: 60, md: 68 }, gap: 2 }}>
          <Box component={RouterLink} to="/" sx={{ textDecoration: 'none', flexShrink: 0 }}>
            <Logo />
          </Box>

          {/* Liens centraux — masqués sur mobile */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              gap: 0.5,
              ml: 4,
              flexGrow: 1,
            }}
          >
            {[
              ...baseLinks,
              ...(isAuthenticated ? authLinks : []),
              ...(user && ['vendeur', 'admin'].includes(user.role) ? businessLinks : []),
            ].map((link) => {
              const active = location.pathname === link.to;
              return (
                <Button
                  key={link.to}
                  component={RouterLink}
                  to={link.to}
                  size="small"
                  sx={{
                    color: active ? tokens.primary : tokens.textSecondary,
                    fontWeight: active ? 700 : 500,
                    px: 1.75,
                    '&:hover': { color: tokens.textPrimary, backgroundColor: 'rgba(15,23,42,0.04)' },
                  }}
                >
                  {link.label}
                </Button>
              );
            })}
          </Box>

          <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />

          {isAuthenticated ? (
            <Box className="flex items-center" sx={{ gap: 1 }}>
              <Tooltip title="Mon panier">
                <IconButton
                  component={RouterLink}
                  to="/cart"
                  size="small"
                  sx={{ color: tokens.textPrimary }}
                >
                  <Badge
                    badgeContent={itemCount}
                    color="primary"
                    sx={{ '& .MuiBadge-badge': { fontWeight: 700 } }}
                  >
                    <ShoppingCartOutlinedIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Button
                component={RouterLink}
                to="/profile"
                size="small"
                startIcon={
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      fontSize: 13,
                      fontWeight: 700,
                      backgroundImage: tokens.gradient,
                    }}
                  >
                    {user.first_name?.[0]?.toUpperCase()}
                  </Avatar>
                }
                sx={{ color: tokens.textPrimary, fontWeight: 600, px: 1.5 }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  {user.first_name}
                </Box>
              </Button>
              <Tooltip title="Déconnexion">
                <IconButton size="small" onClick={handleLogout} sx={{ color: tokens.textSecondary }}>
                  <LogoutRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <Box className="flex items-center" sx={{ gap: 1 }}>
              <Button
                component={RouterLink}
                to="/login"
                size="small"
                sx={{ color: tokens.textPrimary, fontWeight: 600 }}
              >
                Connexion
              </Button>
              <Button component={RouterLink} to="/register" size="small" variant="contained">
                Commencer
              </Button>
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
