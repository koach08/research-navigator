interface UnpaywallResult {
  is_oa: boolean;
  best_oa_location?: {
    url?: string;
    url_for_pdf?: string;
  };
}

export async function checkOpenAccess(doi: string): Promise<{
  is_open_access: boolean;
  pdf_url?: string;
}> {
  const email = process.env.UNPAYWALL_EMAIL;
  if (!email || !doi) {
    return { is_open_access: false };
  }

  try {
    const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`;
    const res = await fetch(url);

    if (!res.ok) {
      return { is_open_access: false };
    }

    const data: UnpaywallResult = await res.json();
    return {
      is_open_access: data.is_oa,
      pdf_url: data.best_oa_location?.url_for_pdf || data.best_oa_location?.url,
    };
  } catch {
    return { is_open_access: false };
  }
}
