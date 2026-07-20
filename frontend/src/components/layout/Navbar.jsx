import { useState } from 'react';
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
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Typography from '@mui/material/Typography';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import Logo from '../common/Logo';
import NotificationBell from '../common/NotificationBell';
import { useAuth } from '../../hooks/useAuth';
import { logoutUser } from '../../store/slices/authSlice';
import { cartReset } from '../../store/slices/cartSlice';
import { tokens } from '../../theme/muiTheme';

// Liens toujours visibles dans la barre (desktop)
const primaryLinks = [
  { label: 'Accueil', to: '/', icon: HomeOutlinedIcon },
  { label: 'Produits', to: '/products', icon: Inventory2OutlinedIcon },
];

// Liens du menu compte, groupés par section et filtrés par rôle
const accountSections = (role) => [
  {
    header: null,
    items: [
      { label: 'Mon profil', to: '/profile', icon: PersonOutlineRoundedIcon },
      { label: 'Mes commandes', to: '/orders', icon: ReceiptLongOutlinedIcon },
    ],
  },
  ...(role === 'vendeur' || role === 'admin'
    ? [
        {
          header: 'Espace vendeur',
          items: [
            { label: 'Dashboard analytique', to: '/dashboard', icon: InsightsOutlinedIcon },
            {
              label: role === 'admin' ? 'Boutiques' : 'Ma boutique',
              to: '/my-shop',
              icon: StorefrontOutlinedIcon,
            },
            { label: 'Intelligence artificielle', to: '/ai', icon: AutoAwesomeOutlinedIcon },
          ],
        },
      ]
    : []),
  ...(role === 'admin'
    ? [
        {
          header: 'Administration',
          items: [{ label: 'Panneau admin', to: '/admin', icon: AdminPanelSettingsOutlinedIcon }],
        },
      ]
    : []),
];

export default function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const itemCount = useSelector((state) => state.cart.cart.item_count);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sections = isAuthenticated ? accountSections(user.role) : [];
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();

  const handleLogout = async () => {
    setMenuAnchor(null);
    setDrawerOpen(false);
    await dispatch(logoutUser());
    dispatch(cartReset());
    navigate('/login');
  };

  const goTo = (to) => {
    setMenuAnchor(null);
    setDrawerOpen(false);
    navigate(to);
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
        <Toolbar disableGutters sx={{ minHeight: { xs: 60, md: 68 }, gap: 1.5 }}>
          {/* Hamburger — mobile uniquement */}
          <IconButton
            onClick={() => setDrawerOpen(true)}
            sx={{ display: { xs: 'inline-flex', md: 'none' }, color: tokens.textPrimary }}
            aria-label="Ouvrir le menu"
          >
            <MenuRoundedIcon />
          </IconButton>

          <Box component={RouterLink} to="/" sx={{ textDecoration: 'none', flexShrink: 0 }}>
            <Logo />
          </Box>

          {/* Liens principaux — desktop */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, ml: 3 }}>
            {primaryLinks.map((link) => {
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

          <Box sx={{ flexGrow: 1 }} />

          {isAuthenticated ? (
            <Box className="flex items-center" sx={{ gap: { xs: 0.5, sm: 1 } }}>
              <NotificationBell />
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

              {/* Avatar → menu compte */}
              <Tooltip title="Mon compte">
                <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
                  <Avatar
                    sx={{
                      width: 34,
                      height: 34,
                      fontSize: 13,
                      fontWeight: 700,
                      backgroundImage: tokens.gradient,
                    }}
                  >
                    {initials}
                  </Avatar>
                </IconButton>
              </Tooltip>

              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                slotProps={{
                  paper: {
                    elevation: 6,
                    sx: {
                      mt: 1.5,
                      minWidth: 250,
                      borderRadius: '14px',
                      border: `1px solid ${tokens.border}`,
                      overflow: 'hidden',
                    },
                  },
                }}
              >
                {/* Identité */}
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.92rem' }} noWrap>
                    {user.first_name} {user.last_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="div">
                    {user.email}
                  </Typography>
                </Box>
                <Divider />

                {sections.map((section, sectionIndex) => [
                  section.header && (
                    <ListSubheader
                      key={`h-${sectionIndex}`}
                      disableSticky
                      sx={{
                        lineHeight: '32px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: tokens.textSecondary,
                        backgroundColor: 'transparent',
                      }}
                    >
                      {section.header}
                    </ListSubheader>
                  ),
                  ...section.items.map((item) => (
                    <MenuItem key={item.to} onClick={() => goTo(item.to)} sx={{ py: 1.1, mx: 0.75, borderRadius: '8px' }}>
                      <ListItemIcon sx={{ minWidth: 34 }}>
                        <item.icon sx={{ fontSize: 20 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: 500 }}
                      />
                    </MenuItem>
                  )),
                ])}

                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={handleLogout} sx={{ py: 1.1, mx: 0.75, borderRadius: '8px', color: tokens.rose }}>
                  <ListItemIcon sx={{ minWidth: 34 }}>
                    <LogoutRoundedIcon sx={{ fontSize: 20, color: tokens.rose }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Déconnexion"
                    primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: 600 }}
                  />
                </MenuItem>
              </Menu>
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

      {/* Drawer mobile */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: 300, borderRadius: '0 16px 16px 0' } } }}
      >
        <Box className="flex items-center justify-between" sx={{ px: 2, py: 1.75 }}>
          <Logo />
          <IconButton onClick={() => setDrawerOpen(false)} aria-label="Fermer le menu">
            <CloseRoundedIcon />
          </IconButton>
        </Box>
        <Divider />

        <List sx={{ px: 1.25, py: 1 }}>
          {primaryLinks.map((link) => {
            const active = location.pathname === link.to;
            return (
              <ListItemButton
                key={link.to}
                onClick={() => goTo(link.to)}
                sx={{
                  borderRadius: '10px',
                  mb: 0.25,
                  backgroundColor: active ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                }}
              >
                <ListItemIcon sx={{ minWidth: 38 }}>
                  <link.icon sx={{ fontSize: 21, color: active ? tokens.primary : tokens.textSecondary }} />
                </ListItemIcon>
                <ListItemText
                  primary={link.label}
                  primaryTypographyProps={{
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.92rem',
                    color: active ? tokens.primary : tokens.textPrimary,
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>

        {isAuthenticated ? (
          <>
            {sections.map((section, sectionIndex) => (
              <Box key={sectionIndex}>
                <Divider sx={{ mx: 2 }} />
                {section.header && (
                  <Typography
                    sx={{
                      px: 2.5,
                      pt: 1.75,
                      pb: 0.5,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: tokens.textSecondary,
                    }}
                  >
                    {section.header}
                  </Typography>
                )}
                <List sx={{ px: 1.25, py: 0.5 }}>
                  {section.items.map((item) => {
                    const active = location.pathname === item.to;
                    return (
                      <ListItemButton
                        key={item.to}
                        onClick={() => goTo(item.to)}
                        sx={{
                          borderRadius: '10px',
                          mb: 0.25,
                          backgroundColor: active ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 38 }}>
                          <item.icon
                            sx={{ fontSize: 21, color: active ? tokens.primary : tokens.textSecondary }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontWeight: active ? 700 : 500,
                            fontSize: '0.92rem',
                            color: active ? tokens.primary : tokens.textPrimary,
                          }}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Box>
            ))}
            <Box sx={{ mt: 'auto', p: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<LogoutRoundedIcon />}
                onClick={handleLogout}
              >
                Déconnexion
              </Button>
            </Box>
          </>
        ) : (
          <Box sx={{ mt: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button fullWidth variant="contained" onClick={() => goTo('/register')}>
              Créer un compte
            </Button>
            <Button fullWidth variant="outlined" onClick={() => goTo('/login')}>
              Connexion
            </Button>
          </Box>
        )}
      </Drawer>
    </AppBar>
  );
}
