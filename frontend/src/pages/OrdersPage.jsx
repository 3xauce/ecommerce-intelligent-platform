import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import { orderService } from '../services/orderService';
import { orderStatusInfo } from '../utils/orderStatus';
import { tokens } from '../theme/muiTheme';

function formatDate(value) {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    orderService
      .list()
      .then((data) => {
        if (!cancelled) {
          setOrders(data.items);
          setStatus('succeeded');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Impossible de charger vos commandes');
          setStatus('failed');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 7 } }} className="anim-fade-up">
      <Typography variant="overline" sx={{ color: tokens.primary }}>
        Historique
      </Typography>
      <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.3rem' }, mt: 0.5, mb: 4 }}>
        Mes commandes
      </Typography>

      {status === 'failed' && <Alert severity="error">{error}</Alert>}

      {status === 'loading' && (
        <Box className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={84} />
          ))}
        </Box>
      )}

      {status === 'succeeded' && orders.length === 0 && (
        <Box className="text-center" sx={{ py: 10 }}>
          <ReceiptLongRoundedIcon sx={{ fontSize: 56, color: 'rgba(15,23,42,0.15)' }} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Aucune commande pour le moment
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
            Vos commandes apparaîtront ici après votre premier achat.
          </Typography>
          <Button component={RouterLink} to="/products" variant="contained">
            Voir les produits
          </Button>
        </Box>
      )}

      {status === 'succeeded' && orders.length > 0 && (
        <Box className="flex flex-col gap-3">
          {orders.map((order) => {
            const info = orderStatusInfo(order.status);
            return (
              <Card
                key={order.id}
                component={RouterLink}
                to={`/orders/${order.id}`}
                sx={{
                  p: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  textDecoration: 'none',
                  color: 'inherit',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.1)',
                    borderColor: 'rgba(99, 102, 241, 0.35)',
                  },
                }}
              >
                <Box
                  className="flex items-center justify-center shrink-0"
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    backgroundColor: 'rgba(79, 70, 229, 0.08)',
                  }}
                >
                  <ReceiptLongRoundedIcon sx={{ color: tokens.primary, fontSize: 22 }} />
                </Box>

                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }} noWrap>
                    Commande n° {order.id.slice(0, 8).toUpperCase()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(order.created_at)}
                  </Typography>
                </Box>

                <Chip size="small" label={info.label} color={info.color} variant="outlined" />

                <Typography sx={{ fontWeight: 800, minWidth: 84, textAlign: 'right' }}>
                  {Number(order.total).toFixed(2)} €
                </Typography>

                <ChevronRightRoundedIcon sx={{ color: tokens.textSecondary }} />
              </Card>
            );
          })}
        </Box>
      )}
    </Container>
  );
}
