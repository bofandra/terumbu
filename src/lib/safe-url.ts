function normalizedRelativePath(value: string) {
  const candidate = value.trim();

  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return null;
  }

  return candidate;
}

function normalizedWebUrl(value: string, allowHttp = false) {
  const candidate = value.trim();

  if (!candidate) {
    return null;
  }

  try {
    const url = new URL(candidate);

    if (url.protocol === "https:" || (allowHttp && url.protocol === "http:")) {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

export function safeNavigationUrl(value: unknown, fallback = "") {
  const candidate = typeof value === "string" ? value : "";
  const fallbackCandidate = typeof fallback === "string" ? fallback : "";

  return (
    normalizedRelativePath(candidate) ??
    normalizedWebUrl(candidate) ??
    normalizedRelativePath(fallbackCandidate) ??
    normalizedWebUrl(fallbackCandidate) ??
    ""
  );
}

export function safeEmbedUrl(value: unknown, fallback = "") {
  const candidate = typeof value === "string" ? value : "";
  const fallbackCandidate = typeof fallback === "string" ? fallback : "";

  return normalizedWebUrl(candidate) ?? normalizedWebUrl(fallbackCandidate) ?? "";
}

export function safeImageUrl(value: unknown, fallback: string | null = null) {
  const candidate = typeof value === "string" ? value.trim() : "";
  const fallbackCandidate = typeof fallback === "string" ? fallback.trim() : "";

  const normalize = (input: string) => {
    if (!input) {
      return null;
    }

    const relative = normalizedRelativePath(input);
    if (relative) {
      return relative;
    }

    const web = normalizedWebUrl(input);
    if (web) {
      return web;
    }

    if (/^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(input)) {
      return input;
    }

    return null;
  };

  return normalize(candidate) ?? normalize(fallbackCandidate);
}
