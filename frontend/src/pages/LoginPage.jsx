import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import AuthLayout from '../components/common/AuthLayout';
import GoogleSignInButton from '../components/common/GoogleSignInButton';
import { loginUser } from '../store/slices/authSlice';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await dispatch(loginUser({ email, password }));
    setSubmitting(false);

    if (loginUser.fulfilled.match(result)) {
      navigate(redirectTo, { replace: true });
    } else {
      setError(result.payload || 'Échec de la connexion');
    }
  };

  return (
    <AuthLayout title="Connexion" subtitle="Heureux de vous revoir. Accédez à votre espace.">
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <TextField
          name="email"
          label="Adresse email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
          autoComplete="email"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MailOutlineRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          name="password"
          label="Mot de passe"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
          autoComplete="current-password"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlinedIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword((v) => !v)}
                  edge="end"
                  size="small"
                  aria-label="Afficher le mot de passe"
                >
                  {showPassword ? (
                    <VisibilityOffRoundedIcon fontSize="small" />
                  ) : (
                    <VisibilityRoundedIcon fontSize="small" />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {submitting ? 'Connexion en cours...' : 'Se connecter'}
        </Button>
      </form>

      <GoogleSignInButton onSuccess={() => navigate(redirectTo, { replace: true })} />

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3.5 }}>
        Pas encore de compte ?{' '}
        <Link component={RouterLink} to="/register" underline="hover" sx={{ fontWeight: 600 }}>
          Créer un compte
        </Link>
      </Typography>
    </AuthLayout>
  );
}
