import { useCallback, useEffect, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Menu from '@mui/material/Menu';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import CircleIcon from '@mui/icons-material/Circle';
import { notificationService } from '../../services/notificationService';
import { tokens } from '../../theme/muiTheme';

const REFRESH_INTERVAL_MS = 30000;

function timeAgo(value) {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}

export default function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const data = await notificationService.list({ limit: 10 });
      setItems(data.items);
      setUnreadCount(data.unread_count);
    } catch {
      // silencieux : la cloche ne doit jamais casser la navbar
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    refresh();
  };

  const handleMarkRead = async (notification) => {
    if (!notification.is_read) {
      await notificationService.markRead(notification.id).catch(() => {});
      refresh();
    }
  };

  const handleMarkAll = async () => {
    await notificationService.markAllRead().catch(() => {});
    refresh();
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton size="small" onClick={handleOpen} sx={{ color: tokens.textPrimary }}>
          <Badge badgeContent={unreadCount} color="error" sx={{ '& .MuiBadge-badge': { fontWeight: 700 } }}>
            <NotificationsNoneRoundedIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 420, borderRadius: '14px' } } }}
      >
        <Box className="flex items-center justify-between" sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>Notifications</Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAll} sx={{ fontSize: 12 }}>
              Tout marquer lu
            </Button>
          )}
        </Box>
        <Divider />

        {items.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3, textAlign: 'center' }}>
            Aucune notification pour le moment.
          </Typography>
        )}

        {items.map((notification) => (
          <Box
            key={notification.id}
            onClick={() => handleMarkRead(notification)}
            sx={{
              px: 2,
              py: 1.5,
              cursor: 'pointer',
              backgroundColor: notification.is_read ? 'transparent' : 'rgba(79, 70, 229, 0.05)',
              '&:hover': { backgroundColor: 'rgba(15, 23, 42, 0.04)' },
              borderBottom: `1px solid ${tokens.border}`,
            }}
          >
            <Box className="flex items-center" sx={{ gap: 1 }}>
              {!notification.is_read && <CircleIcon sx={{ fontSize: 8, color: tokens.primary }} />}
              <Typography variant="body2" sx={{ fontWeight: notification.is_read ? 500 : 700 }} noWrap>
                {notification.title}
              </Typography>
            </Box>
            {notification.message && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                {notification.message}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: 11 }}>
              {timeAgo(notification.created_at)}
            </Typography>
          </Box>
        ))}
      </Menu>
    </>
  );
}
