import React from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';

export const PageLoader: React.FC<{ title?: string }> = ({ title = 'Loading...' }) => {
  return (
    <Box
      minHeight="100vh"
      width="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Stack direction="column" spacing={2} alignItems="center">
        <CircularProgress size={40} thickness={4} />
        <Typography variant="subtitle2" color="text.secondary">
          {title}
        </Typography>
      </Stack>
    </Box>
  );
};

export const SkeletonPageLoader: React.FC = () => (
  <Box p={3}>
    <Box display="flex" flexDirection="column" gap={3}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
          gap: 2,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Box key={i} sx={{ height: 110, borderRadius: 3, bgcolor: 'action.hover', opacity: 0.4 }} />
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 2 }}>
        <Box sx={{ height: 320, borderRadius: 3, bgcolor: 'action.hover', opacity: 0.3 }} />
        <Box sx={{ height: 320, borderRadius: 3, bgcolor: 'action.hover', opacity: 0.3 }} />
      </Box>
      <Box sx={{ height: 420, borderRadius: 3, bgcolor: 'action.hover', opacity: 0.3 }} />
    </Box>
  </Box>
);
