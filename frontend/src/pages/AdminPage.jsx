import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import { adminService } from '../services/adminService';
import { orderStatusInfo } from '../utils/orderStatus';
import { useAuth } from '../hooks/useAuth';
import { tokens } from '../theme/muiTheme';

function euro(value) {
  return `${Number(value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function StatCard({ icon: Icon, label, value, hint, color = tokens.primary, bg = 'rgba(79, 70, 229, 0.08)' }) {
  return (
    <Card sx={{ p: 2.5, height: '100%' }}>
      <Box className="flex items-center" sx={{ gap: 1.5, mb: 1.5 }}>
        <Box className="flex items-center justify-center shrink-0" sx={{ width: 38, height: 38, borderRadius: '11px', backgroundColor: bg }}>
          <Icon sx={{ fontSize: 20, color }} />
        </Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: '1.65rem', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          {hint}
        </Typography>
      )}
    </Card>
  );
}

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState(null);

  const load = useCallback(async () => {
    try {
      const [statsData, usersData, ordersData] = await Promise.all([
        adminService.stats(),
        adminService.users({ limit: 100 }),
        adminService.orders({ limit: 15 }),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setOrders(ordersData.items);
      setStatus('succeeded');
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de charger l'administration");
      setStatus('failed');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRoleChange = async (userId, role) => {
    try {
      const updated = await adminService.setUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setSnackbar({ severity: 'success', message: 'Rôle mis à jour' });
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.response?.data?.error || 'Échec de la mise à jour' });
    }
  };

  const handleStatusChange = async (userId, isActive) => {
    try {
      const updated = await adminService.setUserStatus(userId, isActive);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setSnackbar({ severity: 'success', message: isActive ? 'Compte activé' : 'Compte désactivé' });
    } catch (err) {
      setSnackbar({ severity: 'error', message: err.response?.data?.error || 'Échec de la mise à jour' });
    }
  };

  if (status === 'loading') {
    return (
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Skeleton width={280} height={44} />
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {[0, 1, 2, 3].map((i) => (
            <Grid item xs={6} md={3} key={i}>
              <Skeleton variant="rounded" height={120} />
            </Grid>
          ))}
          <Grid item xs={12}>
            <Skeleton variant="rounded" height={340} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (status === 'failed') {
    return (
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }} className="anim-fade-up">
      <Typography variant="overline" sx={{ color: tokens.primary }}>
        Administration
      </Typography>
      <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.3rem' }, mt: 0.5, mb: 4 }}>
        Pilotage de la plateforme
      </Typography>

      <Grid container spacing={3}>
        {/* Stats globales */}
        <Grid item xs={6} md={3}>
          <StatCard
            icon={PeopleAltRoundedIcon}
            label="Utilisateurs"
            value={stats.users.total}
            hint={`${stats.users.admin} admin · ${stats.users.vendeur} vendeurs · ${stats.users.client} clients`}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={Inventory2RoundedIcon}
            label="Produits"
            value={stats.products.products_count}
            hint={`${stats.products.active_products} actifs`}
            color="#F59E0B"
            bg="rgba(245, 158, 11, 0.12)"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={ShoppingBagRoundedIcon}
            label="Commandes"
            value={stats.orders.orders_count}
            hint={`${stats.scraping.stores_count} stores surveillés`}
            color="#0EA5E9"
            bg="rgba(14, 165, 233, 0.1)"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={PaidRoundedIcon}
            label="CA plateforme"
            value={euro(stats.orders.revenue_paid)}
            hint={`${euro(stats.orders.revenue_pending)} en attente`}
            color="#10B981"
            bg="rgba(16, 185, 129, 0.1)"
          />
        </Grid>

        {/* Gestion des utilisateurs */}
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 2 }}>
              Gestion des utilisateurs
            </Typography>
            <TableContainer sx={{ maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Utilisateur</TableCell>
                    <TableCell>Rôle</TableCell>
                    <TableCell align="center">Actif</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => {
                    const isSelf = user.id === currentUser?.id;
                    return (
                      <TableRow key={user.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                            {user.first_name} {user.last_name} {isSelf && <Chip label="vous" size="small" sx={{ height: 16, fontSize: 10, ml: 0.5 }} />}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Select
                            size="small"
                            value={user.role}
                            disabled={isSelf}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            sx={{ fontSize: 13, minWidth: 110 }}
                          >
                            <MenuItem value="client">Client</MenuItem>
                            <MenuItem value="vendeur">Vendeur</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            size="small"
                            checked={user.is_active}
                            disabled={isSelf}
                            onChange={(e) => handleStatusChange(user.id, e.target.checked)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Commandes récentes */}
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 2 }}>
              Commandes récentes
            </Typography>
            {orders.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aucune commande sur la plateforme.
              </Typography>
            ) : (
              <TableContainer sx={{ maxHeight: 420 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Client</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.map((order) => {
                      const info = orderStatusInfo(order.status);
                      return (
                        <TableRow key={order.id} hover>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
                              {order.customer_email || '—'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(order.created_at).toLocaleDateString('fr-FR')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={info.label} color={info.color} variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {euro(order.total)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar && (
          <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar(null)}>
            {snackbar.message}
          </Alert>
        )}
      </Snackbar>
    </Container>
  );
}
