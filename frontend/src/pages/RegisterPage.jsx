import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import AuthLayout from '../components/common/AuthLayout';
import { registerUser } from '../store/slices/authSlice';
import { tokens } from '../theme/muiTheme';

const initialForm = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: 'client',
};

const roleOptions = [
  {
    value: 'client',
    label: 'Client',
    caption: "J'achète des produits",
    icon: ShoppingBagOutlinedIcon,
  },
  {
    value: 'vendeur',
    label: 'Vendeur',
    caption: 'Je vends et j’analyse',
    icon: StorefrontOutlinedIcon,
  },
];

export default function RegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await dispatch(registerUser(form));
    setSubmitting(false);

    if (registerUser.fulfilled.match(result)) {
      navigate('/', { replace: true });
    } else {
      setError(
        Array.isArray(result.payload)
          ? result.payload.join(', ')
          : result.payload || "Échec de l'inscription"
      );
    }
  };

  return (
    <AuthLayout title="Créer un compte" subtitle="Rejoignez la plateforme en moins d'une minute.">
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        {/* Choix du rôle — cartes sélectionnables plutôt qu'un menu déroulant */}
        <ToggleButtonGroup
          exclusive
          fullWidth
          value={form.role}
          onChange={(e, value) => value && setForm((prev) => ({ ...prev, role: value }))}
          sx={{ gap: 1.5, '& .MuiToggleButtonGroup-grouped': { border: `1px solid ${tokens.border} !important`, borderRadius: '12px !important', m: 0 } }}
        >
          {roleOptions.map((option) => {
            const Icon = option.icon;
            const selected = form.role === option.value;
            return (
              <ToggleButton
                key={option.value}
                value={option.value}
                sx={{
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  p: 2,
                  textTransform: 'none',
                  backgroundColor: selected ? 'rgba(79, 70, 229, 0.06) !important' : 'transparent',
                  borderColor: selected ? `${tokens.primary} !important` : undefined,
                  boxShadow: selected ? '0 0 0 3px rgba(79, 70, 229, 0.12)' : 'none',
                  transition: 'box-shadow 160ms ease, background-color 160ms ease',
                }}
              >
                <Icon sx={{ color: selected ? tokens.primary : tokens.textSecondary, mb: 1 }} />
                <Typography sx={{ fontWeight: 700, fontSize: 14, color: tokens.textPrimary }}>
                  {option.label}
                </Typography>
                <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                  {option.caption}
                </Typography>
              </ToggleButton>
            );
          })}
        </ToggleButtonGroup>

        <Box className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <TextField
            name="first_name"
            label="Prénom"
            value={form.first_name}
            onChange={handleChange('first_name')}
            required
            fullWidth
            autoComplete="given-name"
          />
          <TextField
            name="last_name"
            label="Nom"
            value={form.last_name}
            onChange={handleChange('last_name')}
            required
            fullWidth
            autoComplete="family-name"
          />
        </Box>

        <TextField
          name="email"
          label="Adresse email"
          type="email"
          value={form.email}
          onChange={handleChange('email')}
          required
          fullWidth
          autoComplete="email"
        />
        <TextField
          name="password"
          label="Mot de passe"
          type="password"
          helperText="8 caractères minimum"
          value={form.password}
          onChange={handleChange('password')}
          required
          fullWidth
          autoComplete="new-password"
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {submitting ? 'Création du compte...' : 'Créer mon compte'}
        </Button>
      </form>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3.5 }}>
        Déjà un compte ?{' '}
        <Link component={RouterLink} to="/login" underline="hover" sx={{ fontWeight: 600 }}>
          Se connecter
        </Link>
      </Typography>
    </AuthLayout>
  );
}
