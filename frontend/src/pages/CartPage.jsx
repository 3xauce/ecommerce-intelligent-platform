import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import {
  fetchCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from '../store/slices/cartSlice';
import { tokens } from '../theme/muiTheme';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5001';

function CartLine({ item, onQuantityChange, onRemove }) {
  const product = item.product;

  return (
    <Box className="flex items-center" sx={{ gap: 2.5, py: 2.5 }}>
      {/* Miniature */}
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: '#EEF1F6',
          flexShrink: 0,
        }}
        className="flex items-center justify-center"
      >
        {product.images?.[0] ? (
          <Box
            component="img"
            src={`${API_ORIGIN}${product.images[0]}`}
            alt={product.name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Inventory2RoundedIcon sx={{ color: 'rgba(15,23,42,0.18)', fontSize: 28 }} />
        )}
      </Box>

      {/* Infos */}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600 }} noWrap>
          {product.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {Number(item.unit_price).toFixed(2)} € l&apos;unité
        </Typography>
        {item.stock_issue && (
          <Typography variant="caption" sx={{ color: tokens.rose, fontWeight: 600 }}>
            {item.stock_issue}
          </Typography>
        )}
      </Box>

      {/* Stepper quantité */}
      <Box
        className="flex items-center"
        sx={{ border: `1px solid ${tokens.border}`, borderRadius: '10px', flexShrink: 0 }}
      >
        <IconButton
          size="small"
          disabled={item.quantity <= 1}
          onClick={() => onQuantityChange(item.product_id, item.quantity - 1)}
          aria-label="Diminuer la quantité"
        >
          <RemoveRoundedIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ px: 1.5, fontWeight: 700, minWidth: 32, textAlign: 'center' }}>
          {item.quantity}
        </Typography>
        <IconButton
          size="small"
          disabled={item.quantity >= product.stock}
          onClick={() => onQuantityChange(item.product_id, item.quantity + 1)}
          aria-label="Augmenter la quantité"
        >
          <AddRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Sous-total */}
      <Typography sx={{ fontWeight: 800, minWidth: 90, textAlign: 'right', flexShrink: 0 }}>
        {Number(item.subtotal).toFixed(2)} €
      </Typography>

      <Tooltip title="Retirer du panier">
        <IconButton size="small" onClick={() => onRemove(item.product_id)} sx={{ color: tokens.textSecondary }}>
          <DeleteOutlineRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

export default function CartPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cart, status, error } = useSelector((state) => state.cart);

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const handleQuantityChange = (productId, quantity) => {
    dispatch(updateCartItem({ productId, quantity }));
  };

  const handleRemove = (productId) => {
    dispatch(removeCartItem(productId));
  };

  const hasStockIssues = cart.items.some((item) => item.stock_issue);
  const isLoading = status === 'loading' && cart.items.length === 0;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }} className="anim-fade-up">
      <Typography variant="overline" sx={{ color: tokens.primary }}>
        Votre commande
      </Typography>
      <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.3rem' }, mt: 0.5, mb: 4 }}>
        Mon panier
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {isLoading && (
        <Card sx={{ p: 3 }}>
          {[0, 1].map((i) => (
            <Box key={i} className="flex items-center" sx={{ gap: 2.5, py: 2 }}>
              <Skeleton variant="rounded" width={72} height={72} />
              <Box sx={{ flexGrow: 1 }}>
                <Skeleton width="45%" height={24} />
                <Skeleton width="25%" height={18} />
              </Box>
              <Skeleton width={90} height={30} />
            </Box>
          ))}
        </Card>
      )}

      {!isLoading && cart.items.length === 0 && (
        <Box className="text-center" sx={{ py: 10 }}>
          <ShoppingCartOutlinedIcon sx={{ fontSize: 56, color: 'rgba(15,23,42,0.15)' }} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Votre panier est vide
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
            Parcourez le catalogue pour trouver votre bonheur.
          </Typography>
          <Button component={RouterLink} to="/products" variant="contained">
            Voir les produits
          </Button>
        </Box>
      )}

      {!isLoading && cart.items.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '7fr 4fr' },
            gap: 4,
            alignItems: 'start',
          }}
        >
          {/* Lignes du panier */}
          <Card sx={{ px: 3, py: 1 }}>
            {cart.items.map((item, index) => (
              <Box key={item.id}>
                {index > 0 && <Divider />}
                <CartLine
                  item={item}
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemove}
                />
              </Box>
            ))}
          </Card>

          {/* Récapitulatif */}
          <Card sx={{ p: 3, position: { md: 'sticky' }, top: { md: 92 } }}>
            <Typography variant="h6" gutterBottom>
              Récapitulatif
            </Typography>

            <Box className="flex justify-between" sx={{ py: 1 }}>
              <Typography color="text.secondary">
                Articles ({cart.item_count})
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>{Number(cart.total).toFixed(2)} €</Typography>
            </Box>
            <Box className="flex justify-between" sx={{ py: 1 }}>
              <Typography color="text.secondary">Livraison</Typography>
              <Typography sx={{ fontWeight: 600, color: tokens.emerald }}>Offerte</Typography>
            </Box>

            <Divider sx={{ my: 1.5 }} />

            <Box className="flex justify-between items-baseline" sx={{ py: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>Total</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.02em' }}>
                {Number(cart.total).toFixed(2)} €
              </Typography>
            </Box>

            {hasStockIssues && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Certains articles dépassent le stock disponible — ajustez les quantités avant de commander.
              </Alert>
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              endIcon={<ArrowForwardRoundedIcon />}
              disabled={hasStockIssues}
              onClick={() => navigate('/checkout')}
              sx={{ mt: 2.5 }}
            >
              Passer la commande
            </Button>
            <Button
              fullWidth
              size="small"
              onClick={() => dispatch(clearCart())}
              sx={{ mt: 1.5, color: tokens.textSecondary }}
            >
              Vider le panier
            </Button>
          </Card>
        </Box>
      )}
    </Container>
  );
}
