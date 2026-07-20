import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Zoom from '@mui/material/Zoom';
import CircularProgress from '@mui/material/CircularProgress';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { aiService } from '../../services/aiService';
import { useAuth } from '../../hooks/useAuth';
import { tokens } from '../../theme/muiTheme';

// Accueil, sous-titre et suggestions adaptés au rôle de l'utilisateur :
// analytics pour vendeur/admin, assistance boutique pour les clients.
const PRESETS = {
  vendor: {
    subtitle: 'Analyse de votre activité',
    welcome:
      'Bonjour ! Je suis votre assistant analytique. Posez-moi une question sur votre activité, ou choisissez une suggestion ci-dessous.',
    suggestions: [
      'Quel est mon chiffre d’affaires ?',
      'Produits en stock faible ?',
      'Mes meilleures ventes',
      'Prix des concurrents',
    ],
  },
  client: {
    subtitle: 'Aide et suivi de vos achats',
    welcome:
      'Bonjour ! Je peux suivre vos commandes, votre panier, ou chercher un produit. Que puis-je faire pour vous ?',
    suggestions: [
      'Où en est ma commande ?',
      'Que contient mon panier ?',
      'Cherche un casque audio',
      'Aide',
    ],
  },
};

/**
 * Chatbot flottant — visible pour tout utilisateur connecté. Interroge
 * POST /api/ai/chatbot (NLP à règles côté backend, branché sur les données
 * réelles : analytics vendeur ou commandes/panier/catalogue client).
 */
export default function ChatbotWidget() {
  const { user, isAuthenticated } = useAuth();
  const isVendor = ['vendeur', 'admin'].includes(user?.role);
  const preset = PRESETS[isVendor ? 'vendor' : 'client'];

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, thinking]);

  // Réinitialise la conversation quand l'utilisateur (donc le rôle) change.
  useEffect(() => {
    setMessages([{ from: 'bot', text: preset.welcome }]);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAuthenticated) return null;

  const send = async (text) => {
    const message = text.trim();
    if (!message || thinking) return;

    setMessages((prev) => [...prev, { from: 'user', text: message }]);
    setInput('');
    setThinking(true);
    try {
      const reply = await aiService.chatbot(message);
      setMessages((prev) => [...prev, { from: 'bot', text: reply.text }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          from: 'bot',
          text: err.response?.data?.error || 'Désolé, je n’arrive pas à répondre pour le moment.',
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <>
      {/* Panneau de conversation */}
      <Zoom in={open} unmountOnExit>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: { xs: 84, sm: 96 },
            right: { xs: 12, sm: 24 },
            width: { xs: 'calc(100vw - 24px)', sm: 380 },
            maxWidth: 380,
            height: 480,
            maxHeight: 'calc(100vh - 140px)',
            borderRadius: '18px',
            border: `1px solid ${tokens.border}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: (theme) => theme.zIndex.modal,
          }}
        >
          {/* En-tête */}
          <Box
            className="hero-mesh flex items-center justify-between"
            sx={{ px: 2, py: 1.5, color: '#fff' }}
          >
            <Box className="flex items-center" sx={{ gap: 1.25 }}>
              <Box
                className="flex items-center justify-center"
                sx={{ width: 34, height: 34, borderRadius: '10px', backgroundImage: tokens.gradient }}
              >
                <SmartToyRoundedIcon sx={{ fontSize: 19 }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.2 }}>
                  Assistant Novacart
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.75 }}>
                  {preset.subtitle}
                </Typography>
              </Box>
            </Box>
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: '#fff' }} aria-label="Fermer le chatbot">
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Messages */}
          <Box ref={scrollRef} sx={{ flexGrow: 1, overflowY: 'auto', p: 2, backgroundColor: tokens.surface }}>
            {messages.map((message, index) => (
              <Box
                key={index}
                className="flex"
                sx={{ justifyContent: message.from === 'user' ? 'flex-end' : 'flex-start', mb: 1.25 }}
              >
                <Box
                  sx={{
                    maxWidth: '85%',
                    px: 1.75,
                    py: 1.1,
                    borderRadius: message.from === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    backgroundColor: message.from === 'user' ? undefined : '#fff',
                    backgroundImage: message.from === 'user' ? tokens.gradient : 'none',
                    color: message.from === 'user' ? '#fff' : tokens.textPrimary,
                    border: message.from === 'user' ? 'none' : `1px solid ${tokens.border}`,
                    fontSize: '0.86rem',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {message.text}
                </Box>
              </Box>
            ))}

            {thinking && (
              <Box className="flex items-center" sx={{ gap: 1, color: tokens.textSecondary, ml: 0.5 }}>
                <CircularProgress size={14} />
                <Typography variant="caption">analyse en cours…</Typography>
              </Box>
            )}
          </Box>

          {/* Suggestions (tant que l'utilisateur n'a pas écrit) */}
          {messages.length <= 1 && (
            <Box className="flex flex-wrap" sx={{ gap: 0.75, px: 2, pb: 1 }}>
              {preset.suggestions.map((suggestion) => (
                <Chip
                  key={suggestion}
                  label={suggestion}
                  size="small"
                  variant="outlined"
                  onClick={() => send(suggestion)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          )}

          {/* Saisie */}
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center"
            sx={{ gap: 1, p: 1.5, borderTop: `1px solid ${tokens.border}`, backgroundColor: '#fff' }}
          >
            <TextField
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question…"
              size="small"
              fullWidth
              autoComplete="off"
              inputProps={{ maxLength: 500, 'aria-label': 'Message au chatbot' }}
            />
            <IconButton
              type="submit"
              disabled={!input.trim() || thinking}
              sx={{
                color: '#fff',
                backgroundImage: tokens.gradient,
                '&:hover': { backgroundImage: tokens.gradient, opacity: 0.9 },
                '&.Mui-disabled': { backgroundImage: 'none', backgroundColor: 'rgba(15,23,42,0.08)' },
              }}
              aria-label="Envoyer"
            >
              <SendRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      </Zoom>

      {/* Bouton flottant */}
      <Fab
        onClick={() => setOpen((v) => !v)}
        aria-label="Ouvrir l’assistant"
        sx={{
          position: 'fixed',
          bottom: { xs: 20, sm: 28 },
          right: { xs: 16, sm: 28 },
          color: '#fff',
          backgroundImage: tokens.gradient,
          boxShadow: '0 12px 28px rgba(99, 102, 241, 0.45)',
          '&:hover': { backgroundImage: tokens.gradient, transform: 'scale(1.05)' },
          transition: 'transform 160ms ease',
          zIndex: (theme) => theme.zIndex.modal,
        }}
      >
        {open ? <CloseRoundedIcon /> : <SmartToyRoundedIcon />}
      </Fab>
    </>
  );
}
