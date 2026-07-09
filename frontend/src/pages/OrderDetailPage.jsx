import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
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

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  // Stripe redirige ici après confirmPayment avec ces paramètres.
  const paymentReturn = searchParams.get('redirect_status');

  useEffect(() => {
    let cancelled = false;

    orderService
      .getById(id)
      .then((data) => {
        if (!cancelled) {
          setOrder(data);
          setStatus('succeeded');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Commande introuvable');
          setStatus('failed');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 7 } }} className="anim-fade-up">
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={() => navigate('/orders')}
        sx={{ color: tokens.textSecondary, mb: 2 }}
      >
        Mes commandes
      </Button>

      {paymentReturn === 'succeeded' && (
        <Alert icon={<CheckCircleRoundedIcon />} severity="success" sx={{ mb: 3 }}>
          Paiement confirmé — merci pour votre commande ! Le statut sera mis à jour dès
          réception de la confirmation Stripe.
        </Alert>
      )}
      {paymentReturn === 'failed' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Le paiement n&apos;a pas abouti. Vous pouvez réessayer depuis votre panier.
        </Alert>
      )}

      {status === 'failed' && <Alert severity="error">{error}</Alert>}

      {status === 'loading' && (
        <>
          <Skeleton width="45%" height={44} />
          <Skeleton variant="rounded" height={220} sx={{ mt: 3 }} />
        </>
      )}

      {status === 'succeeded' && order && (
        <>
          <Box className="flex flex-wrap items-center" sx={{ gap: 2, mb: 3 }}>
            <Typography variant="h2" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
              Commande n° {order.id.slice(0, 8).toUpperCase()}
            </Typography>
            <Chip
              label={orderStatusInfo(order.status).label}
              color={orderStatusInfo(order.status).color}
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Passée le {formatDate(order.created_at)}
          </Typography>

          <Card sx={{ p: { xs: 3, md: 4 } }}>
            <Typography variant="h6" gutterBottom>
              Articles
            </Typography>

            {order.items.map((item) => (
              <Box key={item.id} className="flex justify-between items-center" sx={{ py: 1.5 }}>
                <Box sx={{ minWidth: 0, pr: 2 }}>
                  <Typography sx={{ fontWeight: 600 }} noWrap>
                    {item.product_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.quantity} × {Number(item.unit_price).toFixed(2)} €
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: 700, flexShrink: 0 }}>
                  {(item.quantity * Number(item.unit_price)).toFixed(2)} €
                </Typography>
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />

            <Box className="flex justify-between items-baseline">
              <Typography sx={{ fontWeight: 700 }}>Total</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.02em' }}>
                {Number(order.total).toFixed(2)} €
              </Typography>
            </Box>

            {order.shipping_address && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Livraison
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {order.shipping_address.line1}
                  <br />
                  {order.shipping_address.postal_code} {order.shipping_address.city}
                  <br />
                  {order.shipping_address.country}
                </Typography>
              </>
            )}
          </Card>
        </>
      )}
    </Container>
  );
}
