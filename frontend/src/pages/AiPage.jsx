import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LinearProgress from '@mui/material/LinearProgress';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import TrendingFlatRoundedIcon from '@mui/icons-material/TrendingFlatRounded';
import QueryStatsRoundedIcon from '@mui/icons-material/QueryStatsRounded';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { aiService } from '../services/aiService';
import { productService } from '../services/productService';
import { useAuth } from '../hooks/useAuth';
import { tokens } from '../theme/muiTheme';

const GRID_STROKE = 'rgba(15, 23, 42, 0.07)';
const AXIS_TICK = { fill: tokens.textSecondary, fontSize: 12 };

function euro(value) {
  return `${Number(value || 0).toFixed(2)} €`;
}

const TREND_DISPLAY = {
  hausse: { label: 'En hausse', color: 'success', icon: TrendingUpRoundedIcon },
  baisse: { label: 'En baisse', color: 'error', icon: TrendingDownRoundedIcon },
  stable: { label: 'Stable', color: 'default', icon: TrendingFlatRoundedIcon },
};

// -------------------------------------------------- Prévisions de ventes ---
function ForecastSection({ products }) {
  const [productId, setProductId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await aiService.predictions(productId));
    } catch (err) {
      setError(err.response?.data?.error || 'Échec de la génération des prévisions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ p: { xs: 3, md: 4 } }}>
      <Typography variant="h6">Prévisions de ventes</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Régression sur l&apos;historique des ventes (scikit-learn) — horizons 30, 60 et 90 jours.
      </Typography>

      <Box className="flex flex-col sm:flex-row" sx={{ gap: 2, mb: 3 }}>
        <TextField
          select
          size="small"
          label="Produit"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          sx={{ minWidth: 260 }}
        >
          {products.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          disabled={!productId || loading}
          onClick={handleGenerate}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <QueryStatsRoundedIcon />}
        >
          {loading ? 'Analyse...' : 'Générer les prévisions'}
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {result && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {result.predictions.map((p) => (
              <Grid item xs={12} sm={4} key={p.period_days}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: '14px',
                    border: `1px solid ${tokens.border}`,
                    backgroundColor: 'rgba(79, 70, 229, 0.03)',
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Horizon {p.period_days} jours
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.02em' }}>
                    {Math.round(p.predicted_units)}
                    <Box component="span" sx={{ fontSize: '0.85rem', fontWeight: 600, color: tokens.textSecondary, ml: 0.75 }}>
                      unités prévues
                    </Box>
                  </Typography>
                  <Box className="flex items-center" sx={{ gap: 1, mt: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={p.confidence * 100}
                      sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {Math.round(p.confidence * 100)} % de confiance
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Historique des ventes utilisé ({result.history.length} jour
            {result.history.length > 1 ? 's' : ''} avec ventes)
          </Typography>
          {result.history.length > 0 ? (
            <Box sx={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.history} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, 'unités']} />
                  <Area type="monotone" dataKey="units" stroke="#4F46E5" strokeWidth={2} fill="rgba(79,70,229,0.12)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Alert severity="info">
              Aucune vente enregistrée pour ce produit — la confiance des prévisions est nulle.
            </Alert>
          )}
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------- Magic Compare ---
function MagicCompareSection() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await aiService.magicCompare(url));
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'analyser cette URL");
    } finally {
      setLoading(false);
    }
  };

  const positioningDisplay = {
    plus_cher: { label: 'Vous êtes plus cher', color: 'error' },
    moins_cher: { label: 'Vous êtes moins cher', color: 'success' },
    aligne: { label: 'Prix alignés', color: 'default' },
  };

  return (
    <Card sx={{ p: { xs: 3, md: 4 } }}>
      <Box className="flex items-center" sx={{ gap: 1, mb: 0.5 }}>
        <AutoAwesomeRoundedIcon sx={{ color: tokens.violet, fontSize: 20 }} />
        <Typography variant="h6">Magic Compare</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Collez l&apos;URL d&apos;un produit concurrent : extraction instantanée et positionnement
        face à votre catalogue.
      </Typography>

      <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-2">
        <TextField
          size="small"
          fullWidth
          placeholder="https://concurrent.com/produit/casque-bluetooth"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          type="url"
        />
        <Button type="submit" variant="contained" disabled={loading} sx={{ flexShrink: 0 }}>
          {loading ? <CircularProgress size={18} color="inherit" /> : 'Analyser'}
        </Button>
      </form>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      {result && (
        <Box sx={{ mt: 3, p: 2.5, borderRadius: '14px', border: `1px solid ${tokens.border}` }}>
          <Typography variant="caption" color="text.secondary">
            Produit détecté ({result.detected.source})
          </Typography>
          <Typography sx={{ fontWeight: 700 }}>{result.detected.name || 'Nom inconnu'}</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: tokens.primary }}>
            {result.detected.price != null
              ? `${Number(result.detected.price).toFixed(2)} ${{ EUR: '€', GBP: '£', USD: '$' }[result.detected.currency] || result.detected.currency || '€'}`
              : 'Prix non détecté'}
          </Typography>

          {result.best_match ? (
            <Box sx={{ mt: 2, pt: 2, borderTop: `1px dashed ${tokens.border}` }}>
              <Typography variant="caption" color="text.secondary">
                Correspondance dans votre catalogue (similarité {Math.round(result.best_match.similarity * 100)} %)
              </Typography>
              <Box className="flex flex-wrap items-center" sx={{ gap: 1.5, mt: 0.5 }}>
                <Typography sx={{ fontWeight: 600 }}>
                  {result.best_match.product.name} — {euro(result.best_match.product.price)}
                </Typography>
                {result.best_match.positioning && (
                  <Chip
                    size="small"
                    label={`${positioningDisplay[result.best_match.positioning].label}${
                      result.best_match.price_diff_pct != null
                        ? ` (${result.best_match.price_diff_pct > 0 ? '+' : ''}${result.best_match.price_diff_pct} %)`
                        : ''
                    }`}
                    color={positioningDisplay[result.best_match.positioning].color}
                  />
                )}
              </Box>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              Aucun produit similaire dans votre catalogue.
            </Alert>
          )}
        </Box>
      )}
    </Card>
  );
}

// ------------------------------------------------------------- Tendances ---
function TrendsSection() {
  const [trends, setTrends] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    aiService
      .trends()
      .then((data) => !cancelled && setTrends(data.trends))
      .catch((err) => !cancelled && setError(err.response?.data?.error || 'Tendances indisponibles'));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card sx={{ p: { xs: 3, md: 4 } }}>
      <Typography variant="h6">Tendances émergentes</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Pente des ventes sur 30 jours, par produit du catalogue.
      </Typography>

      {error && <Alert severity="warning">{error}</Alert>}
      {!trends && !error && <LinearProgress />}

      {trends && trends.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Aucun produit au catalogue.
        </Typography>
      )}

      {trends && trends.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Produit</TableCell>
              <TableCell align="right">Évolution / jour</TableCell>
              <TableCell align="right">Tendance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trends.map((trend) => {
              const display = TREND_DISPLAY[trend.trend] || TREND_DISPLAY.stable;
              const Icon = display.icon;
              return (
                <TableRow key={trend.product_id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {trend.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {trend.slope_pct_per_day > 0 ? '+' : ''}
                    {trend.slope_pct_per_day} %
                  </TableCell>
                  <TableCell align="right">
                    <Chip size="small" icon={<Icon sx={{ fontSize: 15 }} />} label={display.label} color={display.color} variant="outlined" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ Page ---
export default function AiPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const params = user?.role === 'admin' ? { limit: 100 } : { vendor_id: user?.id, limit: 100 };
    productService
      .list(params)
      .then((data) => !cancelled && setProducts(data.items))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }} className="anim-fade-up">
      <Typography variant="overline" sx={{ color: tokens.primary }}>
        Intelligence artificielle
      </Typography>
      <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.3rem' }, mt: 0.5, mb: 4 }}>
        Aide à la décision
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <ForecastSection products={products} />
        </Grid>
        <Grid item xs={12} md={5}>
          <Box className="flex flex-col" sx={{ gap: 3 }}>
            <MagicCompareSection />
            <TrendsSection />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}
