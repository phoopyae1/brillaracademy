"use client";

import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { listIntegrations, type Integration } from "@/lib/db";

export default function WidgetContainer() {
  const [widgets, setWidgets] = useState<Integration[]>([]);
  const [loadingWidgets, setLoadingWidgets] = useState(true);

  useEffect(() => {
    const loadWidgets = async () => {
      try {
        const integrations = await listIntegrations();
        setWidgets(integrations);
      } catch (error) {
        console.error("Failed to load widgets:", error);
      } finally {
        setLoadingWidgets(false);
      }
    };
    loadWidgets();
  }, []);

  if (!widgets.length) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        right: 0,
        zIndex: 1000,
        width: { xs: "100%", md: "400px" },
        maxWidth: { xs: "100%", md: "400px" },
        height: { xs: "600px", md: "800px" },
        maxHeight: { xs: "600px", md: "800px" },
        overflow: "hidden",
        isolation: "isolate",
        pointerEvents: "none",
        "& > *": {
          pointerEvents: "auto",
        },
        "& iframe": {
          position: "absolute !important",
          top: "0 !important",
          left: "0 !important",
          right: "0 !important",
          bottom: "0 !important",
          width: "100% !important",
          maxWidth: "100% !important",
          height: "100% !important",
          maxHeight: "100% !important",
          border: "none !important",
          display: "block !important",
          zIndex: "1 !important",
          pointerEvents: "auto",
        },
      }}
    >
      {loadingWidgets ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            background: "rgba(255, 255, 255, 0.95)",
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
            position: "relative",
            zIndex: 1,
            isolation: "isolate",
            contain: "layout style paint size",
          }}
          dangerouslySetInnerHTML={{ __html: widgets[0].iframe }}
        />
      )}
    </Box>
  );
}

