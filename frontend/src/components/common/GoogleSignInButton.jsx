import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { googleLogin } from '../../store/slices/authSlice';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GSI_SRC = 'https://accounts.google.com/gsi/client';

function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return undefined;
    }
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
    return undefined;
  });
}

/**
 * Bouton "Se connecter avec Google" (Google Identity Services).
 * Ne rend rien si VITE_GOOGLE_CLIENT_ID n'est pas configuré — la connexion
 * classique par email reste alors la seule option, sans erreur visible.
 * `role` est transmis au backend pour les créations de compte ("client"
 * par défaut, "vendeur" depuis la page d'inscription si sélectionné).
 */
export default function GoogleSignInButton({ role, onSuccess }) {
  const buttonRef = useRef(null);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!CLIENT_ID) return;

    let cancelled = false;

    loadGsiScript()
      .then(() => {
        if (cancelled || !buttonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async (response) => {
            const result = await dispatch(
              googleLogin({ credential: response.credential, role })
            );
            if (googleLogin.fulfilled.match(result)) {
              if (onSuccess) {
                onSuccess(result.payload);
              } else {
                navigate('/', { replace: true });
              }
            } else {
              setError(result.payload || 'Échec de la connexion Google');
            }
          },
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: 336,
          text: 'continue_with',
          locale: 'fr',
        });
      })
      .catch(() => setError('Impossible de charger Google Sign-In (réseau ?)'));

    return () => {
      cancelled = true;
    };
  }, [dispatch, navigate, role, onSuccess]);

  if (!CLIENT_ID) return null;

  return (
    <Box>
      <Divider sx={{ my: 3 }}>
        <Typography variant="caption" color="text.secondary">
          ou
        </Typography>
      </Divider>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box ref={buttonRef} className="flex justify-center" />
    </Box>
  );
}
