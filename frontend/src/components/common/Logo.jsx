import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import { tokens } from '../../theme/muiTheme';

/**
 * Marque "Novacart" : pictogramme dégradé + wordmark.
 * variant="light" pour les fonds sombres (hero, footer, panneau auth).
 */
export default function Logo({ variant = 'dark', withText = true, size = 34 }) {
  const textColor = variant === 'light' ? '#FFFFFF' : tokens.textPrimary;

  return (
    <Box className="flex items-center gap-2.5" sx={{ minWidth: 0 }}>
      <Box
        className="flex items-center justify-center shrink-0"
        sx={{
          width: size,
          height: size,
          borderRadius: `${Math.round(size * 0.32)}px`,
          backgroundImage: tokens.gradient,
          boxShadow: '0 6px 16px rgba(99, 102, 241, 0.4)',
        }}
      >
        <InsightsRoundedIcon sx={{ color: '#fff', fontSize: size * 0.62 }} />
      </Box>
      {withText && (
        <Typography
          noWrap
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.02em',
            fontSize: size * 0.56,
            color: textColor,
            lineHeight: 1,
          }}
        >
          Novacart
        </Typography>
      )}
    </Box>
  );
}
