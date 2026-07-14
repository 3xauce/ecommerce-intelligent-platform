import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import InputAdornment from '@mui/material/InputAdornment';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import AddShoppingCartRoundedIcon from '@mui/icons-material/AddShoppingCartRounded';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { addCartItem } from '../store/slices/cartSlice';
import { useAuth } from '../hooks/useAuth';
import { tokens } from '../theme/muiTheme';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5001';

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function ProductSkeleton() {
  return (
    <Card>
      <Skeleton variant="rectangular" sx={{ aspectRatio: '4 / 3', height: 'auto', width: '100%' }} />
      <CardContent>
        <Skeleton width="70%" height={26} />
        <Skeleton width="95%" height={18} sx={{ mt: 1 }} />
        <Skeleton width="40%" height={30} sx={{ mt: 1.5 }} />
      </CardContent>
    </Card>
  );
}

function ProductCard({ product, onAddToCart }) {
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 5;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)',
          borderColor: 'rgba(99, 102, 241, 0.35)',
        },
        '&:hover .product-image': { transform: 'scale(1.05)' },
      }}
    >
      {/* Zone image avec ratio fixe et zoom au survol */}
      <Box sx={{ position: 'relative', overflow: 'hidden', aspectRatio: '4 / 3', backgroundColor: '#EEF1F6' }}>
        {product.images?.[0] ? (
          <Box
            component="img"
            className="product-image"
            src={`${API_ORIGIN}${product.images[0]}`}
            alt={product.name}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        ) : (
          <Box
            className="flex items-center justify-center"
            sx={{ width: '100%', height: '100%', color: 'rgba(15,23,42,0.18)' }}
          >
            <Inventory2RoundedIcon sx={{ fontSize: 56 }} />
          </Box>
        )}

        {(outOfStock || lowStock) && (
          <Chip
            size="small"
            label={outOfStock ? 'Rupture de stock' : `Plus que ${product.stock}`}
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              backgroundColor: outOfStock ? 'rgba(15,23,42,0.85)' : 'rgba(245, 158, 11, 0.95)',
              color: '#fff',
              backdropFilter: 'blur(4px)',
            }}
          />
        )}
      </Box>

      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2.5 }}>
        <Typography variant="h6" sx={{ fontSize: '1.02rem' }} noWrap title={product.name}>
          {product.name}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: 40,
          }}
        >
          {product.description || 'Aucune description fournie.'}
        </Typography>

        <Box className="flex items-baseline justify-between" sx={{ mt: 'auto', pt: 2 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
            {Number(product.price).toFixed(2)}
            <Box component="span" sx={{ fontSize: '0.85rem', fontWeight: 600, color: tokens.textSecondary, ml: 0.5 }}>
              €
            </Box>
          </Typography>
          {!outOfStock && (
            <Typography variant="caption" sx={{ color: tokens.emerald, fontWeight: 600 }}>
              En stock
            </Typography>
          )}
        </Box>

        <Button
          fullWidth
          variant="outlined"
          size="small"
          disabled={outOfStock}
          startIcon={<AddShoppingCartRoundedIcon />}
          onClick={() => onAddToCart(product)}
          sx={{ mt: 1.5 }}
        >
          {outOfStock ? 'Indisponible' : 'Ajouter au panier'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [snackbar, setSnackbar] = useState(null);
  const debouncedSearch = useDebouncedValue(search, 350);

  useEffect(() => {
    let cancelled = false;
    categoryService
      .list()
      .then((data) => !cancelled && setCategories(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const handleAddToCart = async (product) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    const result = await dispatch(addCartItem({ productId: product.id, quantity: 1 }));
    if (addCartItem.fulfilled.match(result)) {
      setSnackbar({ severity: 'success', message: `« ${product.name} » ajouté au panier` });
    } else {
      setSnackbar({ severity: 'error', message: result.payload || "Impossible d'ajouter l'article" });
    }
  };

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (selectedCategory) params.category_id = selectedCategory;

    productService
      .list(params)
      .then((data) => {
        if (!cancelled) {
          setProducts(data.items);
          setStatus('succeeded');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Impossible de charger les produits');
          setStatus('failed');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, selectedCategory]);

  const skeletons = useMemo(() => Array.from({ length: 8 }, (_, i) => i), []);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }} className="anim-fade-up">
      {/* En-tête de page */}
      <Box
        className="flex flex-col md:flex-row md:items-end md:justify-between"
        sx={{ gap: 3, mb: { xs: 4, md: 5 } }}
      >
        <Box>
          <Typography variant="overline" sx={{ color: tokens.primary }}>
            Catalogue
          </Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.3rem' }, mt: 0.5 }}>
            Nos produits
          </Typography>
          {status === 'succeeded' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {products.length} produit{products.length > 1 ? 's' : ''} disponible
              {products.length > 1 ? 's' : ''}
            </Typography>
          )}
        </Box>

        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit..."
          size="small"
          sx={{ width: { xs: '100%', md: 320 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ color: tokens.textSecondary }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Filtre par catégorie */}
      {categories.length > 0 && (
        <Box className="flex flex-wrap items-center" sx={{ gap: 1, mb: 3 }}>
          <Chip
            label="Tout"
            size="small"
            onClick={() => setSelectedCategory(null)}
            color={selectedCategory === null ? 'primary' : 'default'}
            variant={selectedCategory === null ? 'filled' : 'outlined'}
          />
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              size="small"
              onClick={() =>
                setSelectedCategory(selectedCategory === category.id ? null : category.id)
              }
              color={selectedCategory === category.id ? 'primary' : 'default'}
              variant={selectedCategory === category.id ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      )}

      {status === 'failed' && <Alert severity="error">{error}</Alert>}

      {status === 'loading' && (
        <Grid container spacing={3}>
          {skeletons.map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <ProductSkeleton />
            </Grid>
          ))}
        </Grid>
      )}

      {status === 'succeeded' && products.length === 0 && (
        <Box className="text-center" sx={{ py: 10 }}>
          <Inventory2RoundedIcon sx={{ fontSize: 56, color: 'rgba(15,23,42,0.15)' }} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            {debouncedSearch ? 'Aucun résultat pour cette recherche' : 'Aucun produit pour le moment'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {debouncedSearch
              ? 'Essayez un autre terme de recherche.'
              : 'Les vendeurs ajouteront bientôt leurs produits.'}
          </Typography>
        </Box>
      )}

      {status === 'succeeded' && products.length > 0 && (
        <Grid container spacing={3}>
          {products.map((product) => (
            <Grid item xs={12} sm={6} md={3} key={product.id}>
              <ProductCard product={product} onAddToCart={handleAddToCart} />
            </Grid>
          ))}
        </Grid>
      )}

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={3200}
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
