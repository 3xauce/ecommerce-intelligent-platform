import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { orderService } from '../services/orderService';
import { fetchCart } from '../store/slices/cartSlice';
import { tokens } from '../theme/muiTheme';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripeConfigured = Boolean(publishableKey && publishableKey.startsWith('pk_') && !publishableKey.endsWith('...'));

function PaymentForm({ orderId }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders/${orderId}`,
      },
    });

    // On n'arrive ici que si la confirmation échoue (sinon Stripe redirige).
    setError(stripeError?.message || 'Le paiement a échoué, veuillez réessayer.');
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement />
      {error && <Alert severity="error">{error}</Alert>}
      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={!stripe || submitting}
        startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <LockRoundedIcon />}
      >
        {submitting ? 'Paiement en cours...' : 'Payer maintenant'}
      </Button>
    </form>
  );
}

const initialAddress = { line1: '', city: '', postal_code: '', country: 'France' };

export default function CheckoutPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cart } = useSelector((state) => state.cart);

  const [address, setAddress] = useState(initialAddress);
  const [checkoutState, setCheckoutState] = useState({
    status: 'form',
    clientSecret: null,
    orderId: null,
    // Copie figée du panier au moment de la commande : le panier serveur est
    // vidé après le checkout, mais le récapitulatif doit rester affiché.
    summary: null,
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const stripePromise = useMemo(
    () => (stripeConfigured ? loadStripe(publishableKey) : null),
    []
  );

  const handleAddressChange = (field) => (event) => {
    setAddress((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleCreateOrder = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { order, clientSecret } = await orderService.checkout({
        currency: 'eur',
        shippingAddress: address,
      });
      // Le panier a été vidé côté serveur — on synchronise le badge.
      dispatch(fetchCart());
      setCheckoutState({
        status: 'payment',
        clientSecret,
        orderId: order.id,
        summary: { items: cart.items, total: cart.total },
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer la commande. Vérifiez la configuration Stripe du serveur.');
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.items.length === 0 && checkoutState.status === 'form') {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }} className="anim-fade-up">
        <Typography variant="h5" gutterBottom>
          Votre panier est vide
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Ajoutez des articles avant de passer commande.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/products')}>
          Voir les produits
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }} className="anim-fade-up">
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={() => navigate('/cart')}
        sx={{ color: tokens.textSecondary, mb: 2 }}
      >
        Retour au panier
      </Button>

      <Typography variant="overline" sx={{ color: tokens.primary }}>
        Paiement sécurisé
      </Typography>
      <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.3rem' }, mt: 0.5, mb: 4 }}>
        Finaliser la commande
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '7fr 4fr' },
          gap: 4,
          alignItems: 'start',
        }}
      >
        <Card sx={{ p: { xs: 3, md: 4 } }}>
          {checkoutState.status === 'form' && (
            <form onSubmit={handleCreateOrder} className="flex flex-col gap-4">
              <Typography variant="h6">Adresse de livraison</Typography>

              <TextField
                label="Adresse"
                value={address.line1}
                onChange={handleAddressChange('line1')}
                required
                fullWidth
              />
              <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label="Ville"
                  value={address.city}
                  onChange={handleAddressChange('city')}
                  required
                  fullWidth
                />
                <TextField
                  label="Code postal"
                  value={address.postal_code}
                  onChange={handleAddressChange('postal_code')}
                  required
                  fullWidth
                />
              </Box>
              <TextField
                label="Pays"
                value={address.country}
                onChange={handleAddressChange('country')}
                required
                fullWidth
              />

              {error && <Alert severity="error">{error}</Alert>}

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
                sx={{ mt: 1 }}
              >
                {submitting ? 'Création de la commande...' : 'Continuer vers le paiement'}
              </Button>
            </form>
          )}

          {checkoutState.status === 'payment' && (
            <>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Informations de paiement
              </Typography>

              {stripeConfigured && stripePromise ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: checkoutState.clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: { colorPrimary: tokens.primary, borderRadius: '10px' },
                    },
                  }}
                >
                  <PaymentForm orderId={checkoutState.orderId} />
                </Elements>
              ) : (
                <Alert severity="info">
                  La commande a été créée (statut : en attente de paiement), mais la clé publique
                  Stripe n&apos;est pas configurée côté frontend. Renseignez
                  VITE_STRIPE_PUBLISHABLE_KEY dans frontend/.env pour afficher le formulaire de
                  carte bancaire.
                </Alert>
              )}

              <Button
                size="small"
                onClick={() => navigate(`/orders/${checkoutState.orderId}`)}
                sx={{ mt: 2, color: tokens.textSecondary }}
              >
                Voir ma commande
              </Button>
            </>
          )}
        </Card>

        {/* Récapitulatif (figé après création de la commande) */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Votre commande
          </Typography>
          {(checkoutState.summary?.items || cart.items).map((item) => (
            <Box key={item.id} className="flex justify-between" sx={{ py: 0.75 }}>
              <Typography variant="body2" color="text.secondary" noWrap sx={{ pr: 2 }}>
                {item.quantity} × {item.product.name}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, flexShrink: 0 }}>
                {Number(item.subtotal).toFixed(2)} €
              </Typography>
            </Box>
          ))}
          <Divider sx={{ my: 1.5 }} />
          <Box className="flex justify-between items-baseline">
            <Typography sx={{ fontWeight: 700 }}>Total</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '1.3rem' }}>
              {Number(checkoutState.summary?.total ?? cart.total).toFixed(2)} €
            </Typography>
          </Box>
          <Box className="flex items-center" sx={{ gap: 1, mt: 2, color: tokens.textSecondary }}>
            <LockRoundedIcon sx={{ fontSize: 15 }} />
            <Typography variant="caption">Paiement chiffré via Stripe</Typography>
          </Box>
        </Card>
      </Box>
    </Container>
  );
}
