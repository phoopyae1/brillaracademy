'use client';

import * as React from 'react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from '@/lib/theme';

type Props = {
  children: React.ReactNode;
};

export default function ThemeRegistry({ children }: Props) {
  const [cache] = React.useState(() =>
    createCache({ key: 'mui', prepend: true })
  );

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
