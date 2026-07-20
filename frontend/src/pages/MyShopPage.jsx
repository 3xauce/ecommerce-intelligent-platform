import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { productService } from '../services/productService';
import { shopService } from '../services/shopService';
import { categoryService } from '../services/categoryService';
import { useAuth } from '../hooks/useAuth';
import { tokens } from '../theme/muiTheme';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5001';

const emptyForm = { name: '', description: '', price: '', stock: 0, category_id: '' };

function euro(value) {
  return `${Number(value || 0).toFixed(2)} €`;
}

/** Dialog de création / édition d'un produit. */
function ProductFormDialog({ open, product, categories, onClose, onSaved, onError }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(product);

  useEffect(() => {
    if (open) {
      setForm(
        product
          ? {
              name: product.name,
              description: product.description || '',
              price: product.price,
              stock: product.stock,
              category_id: product.category_id || '',
            }
          : emptyForm
      );
    }
  }, [open, product]);

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      price: Number(form.price),
      stock: Number(form.stock),
      category_id: form.category_id || null,
    };

    try {
      if (isEdit) {
        await productService.update(product.id, { ...payload, is_active: product.is_active });
      } else {
        await productService.create(payload);
      }
      onSaved(isEdit ? 'Produit mis à jour' : 'Produit créé');
    } catch (err) {
      const details = err.response?.data?.details;
      onError(Array.isArray(details) ? details.join(', ') : err.response?.data?.error || 'Échec de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {isEdit ? 'Modifier le produit' : 'Ajouter un produit'}
        </DialogTitle>
        <DialogContent className="flex flex-col gap-4" sx={{ pt: '8px !important' }}>
          <TextField label="Nom du produit" value={form.name} onChange={handleChange('name')} required fullWidth />
          <TextField
            label="Description"
            value={form.description}
            onChange={handleChange('description')}
            multiline
            rows={3}
            fullWidth
          />
          <Box className="grid grid-cols-2 gap-4">
            <TextField
              label="Prix (€)"
              type="number"
              value={form.price}
              onChange={handleChange('price')}
              required
              inputProps={{ min: 0.01, step: 0.01 }}
              fullWidth
            />
            <TextField
              label="Stock"
              type="number"
              value={form.stock}
              onChange={handleChange('stock')}
              required
              inputProps={{ min: 0, step: 1 }}
              fullWidth
            />
          </Box>
          <TextField select label="Catégorie" value={form.category_id} onChange={handleChange('category_id')} fullWidth>
            <MenuItem value="">Aucune catégorie</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} sx={{ color: tokens.textSecondary }}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer le produit'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/** Dialog de gestion des images d'un produit. */
function ImagesDialog({ open, product, onClose, onChanged, onError }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  if (!product) return null;

  const handleUpload = async (event) => {
    const files = [...event.target.files];
    if (files.length === 0) return;
    setUploading(true);
    try {
      await productService.uploadImages(product.id, files);
      onChanged(`${files.length} image(s) ajoutée(s)`);
    } catch (err) {
      onError(err.response?.data?.error || "Échec de l'upload (jpeg/png/webp, 5 Mo max)");
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (url) => {
    try {
      await productService.removeImage(product.id, url);
      onChanged('Image supprimée');
    } catch (err) {
      onError(err.response?.data?.error || 'Échec de la suppression');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Images — {product.name}</DialogTitle>
      <DialogContent>
        {(product.images || []).length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            Aucune image pour ce produit.
          </Typography>
        ) : (
          <Box className="grid grid-cols-3 gap-3" sx={{ py: 1 }}>
            {product.images.map((url) => (
              <Box key={url} sx={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${tokens.border}` }}>
                <Box
                  component="img"
                  src={`${API_ORIGIN}${url}`}
                  alt={product.name}
                  sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                />
                <IconButton
                  size="small"
                  onClick={() => handleDelete(url)}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    backgroundColor: 'rgba(15,23,42,0.65)',
                    color: '#fff',
                    '&:hover': { backgroundColor: 'rgba(244,63,94,0.9)' },
                  }}
                >
                  <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={handleUpload}
        />
        <Button
          variant="outlined"
          fullWidth
          disabled={uploading || (product.images || []).length >= 5}
          onClick={() => fileInputRef.current?.click()}
          startIcon={uploading ? <CircularProgress size={16} /> : <AddRoundedIcon />}
          sx={{ mt: 2 }}
        >
          {uploading ? 'Envoi en cours...' : 'Ajouter des images (5 max)'}
        </Button>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Tableau de gestion des produits — partagé entre l'espace vendeur et la vue admin. */
function ProductsTable({ products, onToggleActive, onEdit, onImages, onDelete }) {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Produit</TableCell>
            <TableCell align="right">Prix</TableCell>
            <TableCell align="right">Stock</TableCell>
            <TableCell align="center">En vente</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id} hover sx={{ opacity: product.is_active ? 1 : 0.55 }}>
              <TableCell>
                <Box className="flex items-center" sx={{ gap: 1.5 }}>
                  <Box
                    className="flex items-center justify-center shrink-0"
                    sx={{ width: 44, height: 44, borderRadius: '10px', overflow: 'hidden', backgroundColor: '#EEF1F6' }}
                  >
                    {product.images?.[0] ? (
                      <Box
                        component="img"
                        src={`${API_ORIGIN}${product.images[0]}`}
                        alt={product.name}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Inventory2RoundedIcon sx={{ color: 'rgba(15,23,42,0.2)', fontSize: 20 }} />
                    )}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {product.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 300 }}>
                      {product.description || '—'}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {euro(product.price)}
              </TableCell>
              <TableCell align="right">
                {product.stock <= 5 ? (
                  <Chip size="small" label={product.stock} color={product.stock === 0 ? 'error' : 'warning'} sx={{ fontWeight: 700 }} />
                ) : (
                  product.stock
                )}
              </TableCell>
              <TableCell align="center">
                <Switch size="small" checked={product.is_active} onChange={() => onToggleActive(product)} />
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Gérer les images">
                  <IconButton size="small" onClick={() => onImages(product)}>
                    <ImageRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Modifier">
                  <IconButton size="small" onClick={() => onEdit(product)}>
                    <EditRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Supprimer">
                  <IconButton size="small" onClick={() => onDelete(product)} sx={{ color: tokens.rose }}>
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** Formulaire de création / édition de la boutique du vendeur. */
function ShopForm({ shop, onSaved, onError, submitLabel }) {
  const [form, setForm] = useState({ name: shop?.name || '', description: shop?.description || '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = shop ? await shopService.updateMine(form) : await shopService.create(form);
      onSaved(saved);
    } catch (err) {
      onError(err.response?.data?.error || 'Échec de la sauvegarde de la boutique');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField
        label="Nom de la boutique"
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        required
        fullWidth
        inputProps={{ minLength: 2, maxLength: 255 }}
      />
      <TextField
        label="Description (visible par vos clients)"
        value={form.description}
        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        multiline
        rows={3}
        fullWidth
      />
      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={saving || form.name.trim().length < 2}
        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <StorefrontRoundedIcon />}
      >
        {saving ? 'Enregistrement...' : submitLabel}
      </Button>
    </form>
  );
}

export default function MyShopPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shop, setShop] = useState(null);
  const [shopMissing, setShopMissing] = useState(false);
  const [shops, setShops] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState(null);

  const [formDialog, setFormDialog] = useState({ open: false, product: null });
  const [imagesDialog, setImagesDialog] = useState({ open: false, productId: null });
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [shopDialog, setShopDialog] = useState(false);

  const load = useCallback(async () => {
    try {
      if (isAdmin) {
        const [shopsData, productsData, categoriesData] = await Promise.all([
          shopService.listAll(),
          productService.list({ limit: 100 }),
          categoryService.list(),
        ]);
        setShops(shopsData);
        setProducts(productsData.items);
        setCategories(categoriesData);
        setStatus('succeeded');
        return;
      }

      // Vendeur : la boutique d'abord — sans elle, place à l'onboarding.
      let myShop = null;
      try {
        myShop = await shopService.getMine();
      } catch (err) {
        if (err.response?.status === 404) {
          setShop(null);
          setShopMissing(true);
          setStatus('succeeded');
          return;
        }
        throw err;
      }

      const [productsData, categoriesData] = await Promise.all([
        productService.list({ vendor_id: user?.id, limit: 100 }),
        categoryService.list(),
      ]);
      setShop(myShop);
      setShopMissing(false);
      setProducts(productsData.items);
      setCategories(categoriesData);
      setStatus('succeeded');
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de charger votre boutique');
      setStatus('failed');
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const notifySuccess = (message) => {
    setSnackbar({ severity: 'success', message });
    load();
  };
  const notifyError = (message) => setSnackbar({ severity: 'error', message });

  const handleSaved = (message) => {
    setFormDialog({ open: false, product: null });
    notifySuccess(message);
  };

  const handleToggleActive = async (product) => {
    try {
      await productService.update(product.id, {
        name: product.name,
        description: product.description,
        price: Number(product.price),
        stock: product.stock,
        category_id: product.category_id,
        is_active: !product.is_active,
      });
      notifySuccess(product.is_active ? 'Produit retiré de la vente' : 'Produit remis en vente');
    } catch (err) {
      notifyError(err.response?.data?.error || 'Échec de la mise à jour');
    }
  };

  const handleDelete = async () => {
    try {
      await productService.remove(deleteDialog.id);
      setDeleteDialog(null);
      notifySuccess('Produit supprimé');
    } catch (err) {
      setDeleteDialog(null);
      notifyError(
        err.response?.data?.error ||
          'Suppression impossible (le produit apparaît peut-être dans des commandes — désactivez-le plutôt)'
      );
    }
  };

  const imagesProduct = products.find((p) => p.id === imagesDialog.productId) || null;

  if (status === 'loading') {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Skeleton width={280} height={44} />
        <Skeleton variant="rounded" height={360} sx={{ mt: 3 }} />
      </Container>
    );
  }

  if (status === 'failed') {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  // ------------------------------------------------------------------
  // Vendeur sans boutique : onboarding de création
  // ------------------------------------------------------------------
  if (!isAdmin && shopMissing) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }} className="anim-fade-up">
        <Card sx={{ overflow: 'hidden' }}>
          <Box className="hero-mesh" sx={{ height: 96 }} />
          <Box sx={{ p: { xs: 3, sm: 4 } }}>
            <Box
              className="flex items-center justify-center"
              sx={{
                width: 56,
                height: 56,
                mt: '-52px',
                borderRadius: '16px',
                backgroundImage: tokens.gradient,
                boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)',
              }}
            >
              <StorefrontRoundedIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Typography variant="h4" sx={{ mt: 2.5, fontSize: { xs: '1.5rem', md: '1.8rem' } }}>
              Bienvenue ! Créez votre boutique
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3.5 }}>
              Votre compte vendeur est prêt. Dernière étape avant de vendre :
              donnez un nom à votre boutique — vous pourrez le modifier à tout moment.
            </Typography>
            <ShopForm
              submitLabel="Créer ma boutique"
              onSaved={() => {
                setSnackbar({ severity: 'success', message: 'Boutique créée — bienvenue à bord !' });
                load();
              }}
              onError={notifyError}
            />
          </Box>
        </Card>

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

  // ------------------------------------------------------------------
  // Admin : produits groupés par boutique
  // ------------------------------------------------------------------
  if (isAdmin) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }} className="anim-fade-up">
        <Box sx={{ mb: 4 }}>
          <Typography variant="overline" sx={{ color: tokens.primary }}>
            Administration
          </Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.3rem' }, mt: 0.5 }}>
            Boutiques
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {shops.length} boutique{shops.length > 1 ? 's' : ''} — {products.length} produit
            {products.length > 1 ? 's' : ''} au total
          </Typography>
        </Box>

        {shops.length === 0 && <Alert severity="info">Aucune boutique créée pour le moment.</Alert>}

        {shops.map((shopItem) => {
          const shopProducts = products.filter((p) => p.vendor_id === shopItem.vendor_id);
          return (
            <Accordion
              key={shopItem.id}
              disableGutters
              elevation={0}
              sx={{
                mb: 1.5,
                border: `1px solid ${tokens.border}`,
                borderRadius: '14px !important',
                overflow: 'hidden',
                '&::before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: 2.5 }}>
                <Box className="flex items-center" sx={{ gap: 2, minWidth: 0, flexGrow: 1 }}>
                  <Box
                    className="flex items-center justify-center shrink-0"
                    sx={{ width: 40, height: 40, borderRadius: '12px', backgroundImage: tokens.gradient }}
                  >
                    <StorefrontRoundedIcon sx={{ color: '#fff', fontSize: 20 }} />
                  </Box>
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography sx={{ fontWeight: 700 }} noWrap>
                      {shopItem.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                      {shopItem.vendor_first_name} {shopItem.vendor_last_name} — {shopItem.vendor_email}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={`${shopItem.active_products_count}/${shopItem.products_count} en vente`}
                    sx={{ fontWeight: 600, mr: 1 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0, borderTop: `1px solid ${tokens.border}` }}>
                {shopProducts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
                    Aucun produit dans cette boutique.
                  </Typography>
                ) : (
                  <ProductsTable
                    products={shopProducts}
                    onToggleActive={handleToggleActive}
                    onEdit={(product) => setFormDialog({ open: true, product })}
                    onImages={(product) => setImagesDialog({ open: true, productId: product.id })}
                    onDelete={setDeleteDialog}
                  />
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}

        <ProductFormDialog
          open={formDialog.open}
          product={formDialog.product}
          categories={categories}
          onClose={() => setFormDialog({ open: false, product: null })}
          onSaved={handleSaved}
          onError={notifyError}
        />
        <ImagesDialog
          open={imagesDialog.open}
          product={imagesProduct}
          onClose={() => setImagesDialog({ open: false, productId: null })}
          onChanged={(message) => notifySuccess(message)}
          onError={notifyError}
        />
        <Dialog open={Boolean(deleteDialog)} onClose={() => setDeleteDialog(null)} PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Supprimer ce produit ?</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              « {deleteDialog?.name} » sera définitivement supprimé.
              S&apos;il a déjà été commandé, préférez le désactiver.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setDeleteDialog(null)} sx={{ color: tokens.textSecondary }}>
              Annuler
            </Button>
            <Button variant="contained" color="error" onClick={handleDelete}>
              Supprimer
            </Button>
          </DialogActions>
        </Dialog>
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

  // ------------------------------------------------------------------
  // Vendeur avec boutique : gestion des produits
  // ------------------------------------------------------------------
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }} className="anim-fade-up">
      <Box className="flex flex-col sm:flex-row sm:items-end sm:justify-between" sx={{ gap: 2, mb: 4 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" sx={{ color: tokens.primary }}>
            Espace vendeur
          </Typography>
          <Box className="flex items-center" sx={{ gap: 1.5 }}>
            <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.3rem' }, mt: 0.5 }} noWrap>
              {shop?.name || 'Ma boutique'}
            </Typography>
            <Tooltip title="Modifier la boutique">
              <IconButton size="small" onClick={() => setShopDialog(true)} sx={{ mt: 0.5 }}>
                <EditRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {shop?.description ? `${shop.description} — ` : ''}
            {products.length} produit{products.length > 1 ? 's' : ''} —{' '}
            {products.filter((p) => p.is_active).length} en vente
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => setFormDialog({ open: true, product: null })}
          sx={{ flexShrink: 0 }}
        >
          Ajouter un produit
        </Button>
      </Box>

      {products.length === 0 ? (
        <Box className="text-center" sx={{ py: 10 }}>
          <StorefrontRoundedIcon sx={{ fontSize: 56, color: 'rgba(15,23,42,0.15)' }} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Votre boutique est vide
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
            Ajoutez votre premier produit pour commencer à vendre.
          </Typography>
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setFormDialog({ open: true, product: null })}>
            Ajouter un produit
          </Button>
        </Box>
      ) : (
        <Card>
          <ProductsTable
            products={products}
            onToggleActive={handleToggleActive}
            onEdit={(product) => setFormDialog({ open: true, product })}
            onImages={(product) => setImagesDialog({ open: true, productId: product.id })}
            onDelete={setDeleteDialog}
          />
        </Card>
      )}

      {/* Dialogs */}
      <ProductFormDialog
        open={formDialog.open}
        product={formDialog.product}
        categories={categories}
        onClose={() => setFormDialog({ open: false, product: null })}
        onSaved={handleSaved}
        onError={notifyError}
      />

      <ImagesDialog
        open={imagesDialog.open}
        product={imagesProduct}
        onClose={() => setImagesDialog({ open: false, productId: null })}
        onChanged={(message) => notifySuccess(message)}
        onError={notifyError}
      />

      <Dialog open={shopDialog} onClose={() => setShopDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Modifier ma boutique</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <ShopForm
            shop={shop}
            submitLabel="Enregistrer"
            onSaved={(saved) => {
              setShop(saved);
              setShopDialog(false);
              setSnackbar({ severity: 'success', message: 'Boutique mise à jour' });
            }}
            onError={notifyError}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteDialog)} onClose={() => setDeleteDialog(null)} PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Supprimer ce produit ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            « {deleteDialog?.name} » sera définitivement supprimé de votre boutique.
            Si le produit a déjà été commandé, préférez le désactiver.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteDialog(null)} sx={{ color: tokens.textSecondary }}>
            Annuler
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

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
