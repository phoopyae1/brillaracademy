"use client";

import { useState, useEffect, type CSSProperties } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { listIntegrations, type Integration } from "@/lib/db";

type PreparedWidget = {
  key: string;
  src: string;
  title: string | null;
  allow: string | null;
  loading: string | null;
  width?: string | number;
  height?: string | number;
  minHeight?: string | number;
  style?: CSSProperties;
};

function parseDimensionValue(value?: string | null): string | number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

function toCamelCase(input: string): string {
  return input.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

function parseStyleAttribute(styleAttr: string): {
  style: CSSProperties;
  width?: string | number;
  height?: string | number;
  minHeight?: string | number;
} {
  const style: CSSProperties = {};
  let width: string | number | undefined;
  let height: string | number | undefined;
  let minHeight: string | number | undefined;

  styleAttr
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .forEach((segment) => {
      const [rawProp, rawValue] = segment.split(":");
      if (!rawProp || !rawValue) return;
      const prop = rawProp.trim().toLowerCase();
      const value = rawValue.trim();
      if (!value) return;

      switch (prop) {
        case "width":
          width = parseDimensionValue(value);
          break;
        case "height":
          height = parseDimensionValue(value);
          break;
        case "min-height":
          minHeight = parseDimensionValue(value);
          break;
        default: {
          const camelKey = toCamelCase(prop);
          (style as Record<string, string>)[camelKey] = value;
        }
      }
    });

  return { style, width, height, minHeight };
}

function getStudentIdFromClient(): string | null {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return null;
  }

  const cookieEntry = document.cookie
    .split("; ")
    .find((row) => row.startsWith("brillar_student_id="));

  if (cookieEntry) {
    const [, value] = cookieEntry.split("=");
    if (value) {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }

  try {
    const sessionRaw = window.localStorage?.getItem("student_portal");
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw) as { studentId?: string | number | null };
      if (session?.studentId !== undefined && session.studentId !== null) {
        return String(session.studentId);
      }
    }
  } catch {
    // ignore JSON/localStorage errors
  }

  return null;
}

function prepareIntegrationWidget(
  integration: Integration,
  studentId: string | null
): PreparedWidget | null {
  if (typeof document === "undefined") {
    return null;
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = integration.iframe ?? "";
  const iframe = wrapper.querySelector("iframe");

  if (!iframe) {
    return null;
  }

  const srcAttr = iframe.getAttribute("src");
  if (!srcAttr) {
    return null;
  }

  let sanitizedSrc = srcAttr.trim();
  if (!sanitizedSrc) {
    return null;
  }

  if (typeof window !== "undefined") {
    try {
      const url = new URL(sanitizedSrc, window.location.origin);
      if (studentId) {
        url.searchParams.set("userId", studentId);
      } else {
        url.searchParams.delete("userId");
      }
      sanitizedSrc = url.toString();
    } catch {
      if (studentId && !sanitizedSrc.includes("userId=")) {
        const separator = sanitizedSrc.includes("?") ? "&" : "?";
        sanitizedSrc = `${sanitizedSrc}${separator}userId=${encodeURIComponent(studentId)}`;
      }
    }
  }

  const widthAttr = iframe.getAttribute("width");
  const heightAttr = iframe.getAttribute("height");
  const styleAttr = iframe.getAttribute("style");

  let width = parseDimensionValue(widthAttr);
  let height = parseDimensionValue(heightAttr);
  let minHeight: string | number | undefined;
  let style: CSSProperties | undefined;

  if (styleAttr && styleAttr.trim().length > 0) {
    const parsedStyle = parseStyleAttribute(styleAttr);
    style = Object.keys(parsedStyle.style).length ? parsedStyle.style : undefined;
    width = width ?? parsedStyle.width;
    height = height ?? parsedStyle.height;
    minHeight = parsedStyle.minHeight ?? minHeight;
  }

  return {
    key: integration.contextKey,
    src: sanitizedSrc,
    title: iframe.getAttribute("title"),
    allow: iframe.getAttribute("allow"),
    loading: iframe.getAttribute("loading"),
    width,
    height,
    minHeight,
    style
  };
}

export default function WidgetContainer() {
  const [widgets, setWidgets] = useState<PreparedWidget[]>([]);
  const [loadingWidgets, setLoadingWidgets] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoadingWidgets(false);
      return;
    }

    let mounted = true;

    const loadWidgets = async () => {
      if (!mounted) return;
      setLoadingWidgets(true);

      try {
        const integrations = await listIntegrations();
        const studentId = getStudentIdFromClient();
        
        // Sort integrations by updatedAt (most recent first) or createdAt as fallback
        const sortedIntegrations = [...integrations].sort((a, b) => {
          const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.createdAt).getTime();
          const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.createdAt).getTime();
          return bDate - aDate; // Most recent first
        });
        
        // Only use the latest integration
        const latestIntegration = sortedIntegrations[0];
        const prepared = latestIntegration
          ? [prepareIntegrationWidget(latestIntegration, studentId)].filter((widget): widget is PreparedWidget => widget !== null)
          : [];

        if (!mounted) return;
        setWidgets(prepared);
      } catch (error) {
        console.error("Failed to load widgets:", error);
        if (mounted) {
          setWidgets([]);
        }
      } finally {
        if (mounted) {
        setLoadingWidgets(false);
        }
      }
    };

    loadWidgets();

    const handleStorageChange = () => {
      loadWidgets();
    };

    const handleIntegrationUpdate = () => {
      loadWidgets();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("integration-updated", handleIntegrationUpdate);

    return () => {
      mounted = false;
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("integration-updated", handleIntegrationUpdate);
    };
  }, []);

  if (!widgets.length && !loadingWidgets) {
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
        widgets.length > 0 && (() => {
          const widget = widgets[0]; // Only show the latest widget
          const loadingAttr: "lazy" | "eager" =
            widget.loading === "eager" ? "eager" : "lazy";

          return (
        <Box
              key={`${widget.key}-${widget.src}`} // Include src in key to force remount when it changes
          sx={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
            position: "relative",
            zIndex: 1,
            isolation: "isolate",
                contain: "layout style paint size"
              }}
            >
              <iframe
                key={`iframe-${widget.key}-${widget.src}`} // Force remount iframe when src changes
                src={widget.src}
                title={widget.title ?? `integration-widget`}
                allow={widget.allow ?? "camera; microphone; autoplay; encrypted-media"}
                loading={loadingAttr}
                style={{
                  border: "none",
                  display: "block",
                  width: widget.width ?? "100%",
                  height: widget.height ?? "100%",
                  minHeight: widget.minHeight,
                  ...widget.style
                }}
        />
            </Box>
          );
        })()
      )}
    </Box>
  );
}

