import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Button,
  Chip,
  Fade,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Check as CheckIcon,
  MarkEmailRead as ReadAllIcon,
  Notifications as NotifIcon,
  Assignment as TaskIcon,
  Campaign as CampaignIcon,
  Group as GroupIcon,
  Upload as UploadIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/services/api/notifications';
import { formatDate } from '@/utils/format';
import type { Notification } from '@/types/dto';

const ICONS = {
  campaign: CampaignIcon,
  citizen: GroupIcon,
  import: UploadIcon,
  alert: ErrorIcon,
  task: TaskIcon,
} as const;

export const NotificationsDrawer: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications', page, open],
    queryFn: async () => {
      try {
        return await notificationsApi.list({ page, pageSize: 25 });
      } catch {
        const mock: Notification[] = Array.from({ length: 6 }).map((_, i) => ({
          id: `m-${i}` as any,
          userId: 'u' as any,
          title: [
            'Registration target achieved for Kericho East',
            'Daily sync completed successfully',
            'New campaign started: 2026 General',
            'Import job completed: Kericho.xlsx',
            'Citizen registration update required',
            'Weekly report is ready for download',
          ][i],
          message: 'Tap the notification to view the related section.',
          readAt: i > 2 ? new Date().toISOString() : undefined,
          createdAt: new Date(Date.now() - i * 3_600_000 * 2).toISOString(),
        }));
        return { data: mock, total: mock.length };
      }
    },
    enabled: open,
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifs = data?.data ?? [];
  const unread = notifs.filter((n) => !n.readAt).length;

  const pickIcon = (t: string) => {
    if (t.includes('campaign')) return ICONS.campaign;
    if (t.includes('import')) return ICONS.import;
    if (t.includes('citizen') || t.includes('registration')) return ICONS.citizen;
    if (t.includes('report')) return ICONS.task;
    return NotifIcon;
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 380 }, borderRadius: { sm: '16px 0 0 16px' } },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{ flex: 1, minWidth: 0 }}
        >
          <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
            <NotifIcon fontSize="small" />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Notifications
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {unread > 0 ? `${unread} unread` : 'All caught up!'}
            </Typography>
          </Box>
        </Stack>
        <Tooltip title="Mark all read">
          <IconButton
            size="small"
            color="inherit"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending || unread === 0}
          >
            {markAll.isPending ? (
              <CircularProgress size={18} thickness={5} />
            ) : (
              <ReadAllIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
        <Tooltip title="Refresh">
          <IconButton size="small" color="inherit" onClick={() => refetch()}>
            <CheckIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <IconButton onClick={onClose} size="small" color="inherit">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Divider />

      {isLoading ? (
        <Stack alignItems="center" spacing={1} sx={{ p: 6 }}>
          <CircularProgress />
          <Typography variant="caption" color="text.secondary">
            Loading notifications...
          </Typography>
        </Stack>
      ) : (
        <List disablePadding>
          {notifs.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            notifs.map((n, idx) => {
              const Icon = pickIcon(n.title.toLowerCase());
              return (
                <Fade key={String(n.id) + idx} in={true}>
                  <div>
                    <ListItem
                      alignItems="flex-start"
                      sx={{
                        px: 2.5,
                        py: 1.5,
                        bgcolor: n.readAt ? 'transparent' : (t) =>
                          t.palette.mode === 'light' ? 'rgba(37, 99, 235, 0.05)' : 'rgba(96,165,250,0.08)',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      secondaryAction={
                        n.readAt ? null : (
                          <Tooltip title="Mark as read">
                            <IconButton
                              size="small"
                              onClick={() => markRead.mutate(String(n.id))}
                            >
                              <CheckIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )
                      }
                    >
                      <ListItemAvatar sx={{ mt: 0.25 }}>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: n.readAt ? (t) => `${t.palette.divider}` : 'primary.main',
                            color: n.readAt ? 'text.secondary' : '#fff',
                          }}
                        >
                          <Icon fontSize="small" />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        disableTypography
                        sx={{ mr: 5 }}
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {n.title}
                            </Typography>
                            {!n.readAt && (
                              <Chip
                                size="small"
                                label="New"
                                color="error"
                                sx={{ height: 16, fontSize: 10, fontWeight: 700 }}
                              />
                            )}
                          </Stack>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                              {n.message}
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                              {formatDate(n.createdAt, true)}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                    {idx < notifs.length - 1 && <Divider variant="inset" component="li" />}
                  </div>
                </Fade>
              );
            })
          )}
        </List>
      )}
      <Divider sx={{ mt: 'auto' }} />
      <Box sx={{ p: 2 }}>
        <Button fullWidth variant="outlined" size="small" onClick={onClose}>
          Close drawer
        </Button>
      </Box>
    </Drawer>
  );
};
