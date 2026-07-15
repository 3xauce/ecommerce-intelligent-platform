import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';
import { analyticsService } from '../services/analyticsService';
import { generateDashboardPdf } from '../utils/pdfReport';
import { useAuth } from '../hooks/useAuth';
import { tokens } from '../theme/muiTheme';

// Palette catégorielle validée (ordre fixe, jamais recyclée) — voir dataviz.
const SERIES_COLORS = ['#4F46E5', '#F59E0B', '#0EA5E9', '#8B5CF6'];
const GRID_STROKE = 'rgba(15, 23, 42, 0.07)';
const AXIS_TICK = { fill: tokens.textSecondary, fontSize: 12 };

function euro(value) {
  return `${Number(value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function shortDay(day) {
  const [, month, date] = day.split('-');
  return `${date}/${month}`;
}

function StatCard({ icon: Icon, label, value, hint, color = tokens.primary, bg = 'rgba(79, 70, 229, 0.08)' }) {
  return (
    <Card sx={{ p: 2.5, height: '100%' }}>
      <Box className="flex items-center" sx={{ gap: 1.5, mb: 1.5 }}>
        <Box
          className="flex items-center justify-center shrink-0"
          sx={{ width: 38, height: 38, borderRadius: '11px', backgroundColor: bg }}
        >
          <Icon sx={{ fontSize: 20, color }} />
        </Box>
        <Typography variant="body2" color="text.secondary" noWrap>
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

function ChartCard({ title, subtitle, children, empty, emptyMessage }) {
  return (
    <Card sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" sx={{ fontSize: '1rem' }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
      <Box sx={{ mt: 2, height: 260 }}>
        {empty ? (
          <Box className="flex items-center justify-center h-full">
            <Typography variant="body2" color="text.secondary">
              {emptyMessage}
            </Typography>
          </Box>
        ) : (
          children
        )}
      </Box>
    </Card>
  );
}

const tooltipStyle = {
  borderRadius: 10,
  border: `1px solid ${tokens.border}`,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
  fontSize: 13,
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const [dashboard, setDashboard] = useState(null);
  const [competitors, setCompetitors] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [exportAnchor, setExportAnchor] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    Promise.all([analyticsService.dashboard(days), analyticsService.competitors(days)])
      .then(([dash, comp]) => {
        if (!cancelled) {
          setDashboard(dash);
          setCompetitors(comp);
          setStatus('succeeded');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Impossible de charger le dashboard');
          setStatus('failed');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [days]);

  // Pivot {store_name, day, avg_price}[] -> [{day, "Store A": px, ...}] pour Recharts
  const { trendData, trendStores } = useMemo(() => {
    if (!competitors?.price_trend?.length) return { trendData: [], trendStores: [] };

    const stores = [...new Set(competitors.price_trend.map((r) => r.store_name))].slice(0, 4);
    const byDay = {};
    for (const row of competitors.price_trend) {
      if (!stores.includes(row.store_name)) continue;
      byDay[row.day] = byDay[row.day] || { day: row.day };
      byDay[row.day][row.store_name] = row.avg_price;
    }
    return {
      trendData: Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day)),
      trendStores: stores,
    };
  }, [competitors]);

  const handlePdf = () => {
    generateDashboardPdf({
      dashboard,
      competitors,
      userName: user ? `${user.first_name} ${user.last_name}` : '',
    });
  };

  if (status === 'loading') {
    return (
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Skeleton width={300} height={44} />
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {[0, 1, 2, 3].map((i) => (
            <Grid item xs={6} md={3} key={i}>
              <Skeleton variant="rounded" height={120} />
            </Grid>
          ))}
          <Grid item xs={12} md={7}>
            <Skeleton variant="rounded" height={320} />
          </Grid>
          <Grid item xs={12} md={5}>
            <Skeleton variant="rounded" height={320} />
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

  const { kpis } = dashboard;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }} className="anim-fade-up">
      {/* En-tête + actions */}
      <Box className="flex flex-col md:flex-row md:items-end md:justify-between" sx={{ gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="overline" sx={{ color: tokens.primary }}>
            {dashboard.scope === 'plateforme' ? 'Vue plateforme (admin)' : 'Votre activité'}
          </Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.3rem' }, mt: 0.5 }}>
            Dashboard analytique
          </Typography>
        </Box>

        <Box className="flex items-center" sx={{ gap: 1.5 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={days}
            onChange={(e, value) => value && setDays(value)}
          >
            <ToggleButton value={7}>7 j</ToggleButton>
            <ToggleButton value={30}>30 j</ToggleButton>
            <ToggleButton value={90}>90 j</ToggleButton>
          </ToggleButtonGroup>

          <Button
            size="small"
            variant="contained"
            startIcon={<IosShareRoundedIcon sx={{ fontSize: 17 }} />}
            endIcon={<ExpandMoreRoundedIcon />}
            onClick={(e) => setExportAnchor(e.currentTarget)}
          >
            Exporter
          </Button>
          <Menu
            anchorEl={exportAnchor}
            open={Boolean(exportAnchor)}
            onClose={() => setExportAnchor(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{
              paper: {
                elevation: 6,
                sx: { mt: 1, minWidth: 220, borderRadius: '12px', border: `1px solid ${tokens.border}` },
              },
            }}
          >
            <MenuItem
              onClick={() => {
                setExportAnchor(null);
                analyticsService.downloadCsv('sales');
              }}
              sx={{ py: 1.1, mx: 0.75, borderRadius: '8px' }}
            >
              <ListItemIcon sx={{ minWidth: 34 }}>
                <DownloadRoundedIcon sx={{ fontSize: 19 }} />
              </ListItemIcon>
              <ListItemText primary="CSV — ventes" primaryTypographyProps={{ fontSize: '0.88rem' }} />
            </MenuItem>
            <MenuItem
              onClick={() => {
                setExportAnchor(null);
                analyticsService.downloadCsv('competitors');
              }}
              sx={{ py: 1.1, mx: 0.75, borderRadius: '8px' }}
            >
              <ListItemIcon sx={{ minWidth: 34 }}>
                <DownloadRoundedIcon sx={{ fontSize: 19 }} />
              </ListItemIcon>
              <ListItemText primary="CSV — concurrents" primaryTypographyProps={{ fontSize: '0.88rem' }} />
            </MenuItem>
            <MenuItem
              onClick={() => {
                setExportAnchor(null);
                handlePdf();
              }}
              sx={{ py: 1.1, mx: 0.75, borderRadius: '8px' }}
            >
              <ListItemIcon sx={{ minWidth: 34 }}>
                <PictureAsPdfRoundedIcon sx={{ fontSize: 19, color: tokens.rose }} />
              </ListItemIcon>
              <ListItemText primary="Rapport PDF" primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: 600 }} />
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* KPIs */}
      <Grid container spacing={3}>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={PaidRoundedIcon}
            label="CA encaissé"
            value={euro(kpis.revenue_paid)}
            hint={`${euro(kpis.revenue_pending)} en attente de paiement`}
            color="#10B981"
            bg="rgba(16, 185, 129, 0.1)"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={ShoppingBagRoundedIcon}
            label="Commandes"
            value={kpis.orders_count}
            hint={`sur ${dashboard.period_days} jours glissants`}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={Inventory2RoundedIcon}
            label="Produits"
            value={kpis.products_count}
            hint={`${kpis.low_stock_count} en stock faible (≤ 5)`}
            color="#F59E0B"
            bg="rgba(245, 158, 11, 0.12)"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={TravelExploreRoundedIcon}
            label="Stores surveillés"
            value={kpis.stores_count}
            hint={`${kpis.scraped_products_count} produits collectés`}
            color="#0EA5E9"
            bg="rgba(14, 165, 233, 0.1)"
          />
        </Grid>

        {/* Ventes par jour */}
        <Grid item xs={12} md={7}>
          <ChartCard
            title="Chiffre d'affaires par jour"
            subtitle={`Commandes valides des ${dashboard.period_days} derniers jours`}
            empty={!dashboard.sales_by_day.length}
            emptyMessage="Aucune vente sur la période"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboard.sales_by_day} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="day" tickFormatter={shortDay} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `${v} €`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => (name === 'revenue' ? [euro(value), 'CA'] : [value, 'Commandes'])}
                  labelFormatter={shortDay}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  fill="url(#revenueFill)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* Top produits */}
        <Grid item xs={12} md={5}>
          <ChartCard
            title="Meilleures ventes"
            subtitle="Top 5 par chiffre d'affaires"
            empty={!dashboard.top_products.length}
            emptyMessage="Aucune vente enregistrée"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dashboard.top_products}
                layout="vertical"
                margin={{ top: 4, right: 56, left: 8, bottom: 0 }}
              >
                <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} €`} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ ...AXIS_TICK, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [euro(value), 'CA']}
                  cursor={{ fill: 'rgba(15,23,42,0.03)' }}
                />
                <Bar dataKey="revenue" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={18}>
                  <LabelList
                    dataKey="revenue"
                    position="right"
                    formatter={(v) => euro(v)}
                    style={{ fill: tokens.textSecondary, fontSize: 11, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* Tendance prix concurrents */}
        <Grid item xs={12} md={7}>
          <ChartCard
            title="Prix moyens des concurrents"
            subtitle="Évolution du prix moyen scrapé, par store"
            empty={!trendData.length}
            emptyMessage="Aucune donnée scrapée — configurez un store et lancez un scraping"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="day" tickFormatter={shortDay} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `${v} €`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => euro(value)} labelFormatter={shortDay} />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                {trendStores.map((store, index) => (
                  <Line
                    key={store}
                    type="monotone"
                    dataKey={store}
                    stroke={SERIES_COLORS[index]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* Synthèse concurrents */}
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 2 }}>
              Synthèse par concurrent
            </Typography>
            {competitors.summary.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aucun store concurrent configuré.
              </Typography>
            ) : (
              <TableContainer sx={{ maxHeight: 240 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Store</TableCell>
                      <TableCell align="right">Produits</TableCell>
                      <TableCell align="right">Prix moyen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {competitors.summary.map((store) => (
                      <TableRow key={store.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                            {store.name}
                          </Typography>
                          <Chip label={store.platform} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                        </TableCell>
                        <TableCell align="right">{store.scraped_count}</TableCell>
                        <TableCell align="right">
                          {store.avg_price != null ? euro(store.avg_price) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Grid>

        {/* Derniers produits scrapés */}
        <Grid item xs={12}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 2 }}>
              Derniers produits collectés chez les concurrents
            </Typography>
            {competitors.latest_products.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aucune donnée pour le moment.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Produit</TableCell>
                      <TableCell>Store</TableCell>
                      <TableCell align="right">Prix</TableCell>
                      <TableCell>Stock</TableCell>
                      <TableCell>Collecté le</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {competitors.latest_products.map((item, index) => (
                      <TableRow key={index} hover>
                        <TableCell sx={{ maxWidth: 280 }}>
                          <Typography variant="body2" noWrap title={item.product_name}>
                            {item.product_name}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.store_name}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {item.price != null ? euro(item.price) : '—'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={item.stock_status === 'out_of_stock' ? 'Rupture' : 'En stock'}
                            color={item.stock_status === 'out_of_stock' ? 'error' : 'success'}
                            variant="outlined"
                            sx={{ height: 20, fontSize: 11 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(item.scraped_at).toLocaleString('fr-FR')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
