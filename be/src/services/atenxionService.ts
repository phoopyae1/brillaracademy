import { fetchLatestIntegrationEmbed } from './localMongoService.js';

const ATENXION_API_URL =
  process.env.ATENXION_API_URL || 'https://api-qa.atenxion.ai';
const ATENXION_API_TOKEN = process.env.ATENXION_API_TOKEN || 'asdf';

export async function recordAtenxionTransaction(
  patientId: string,
  token?: string | null
): Promise<boolean> {
  const url = `${ATENXION_API_URL}/api/post-login/new-transaction`;

  const body = {
    userId: patientId.trim(),
  };

  let atenxionToken = '';

  try {
    const latest = await fetchLatestIntegrationEmbed();
    const embeddedToken = (latest as any)?.contextKey as string | undefined;
    if (embeddedToken && embeddedToken.trim().length > 0) {
      atenxionToken = embeddedToken.trim();
    }
  } catch {
    atenxionToken = 'asdf';
  }

  const headers = {
    Authorization: `Bearer ${atenxionToken || ATENXION_API_TOKEN}`,
    'Content-Type': 'application/json',
  };

  try {
    console.log('Atenxion transaction API call:', {
      url,
      body,
      token:
        atenxionToken || ATENXION_API_TOKEN
          ? `${(atenxionToken || ATENXION_API_TOKEN).substring(0, 16)}...`
          : 'none',
    });
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Atenxion transaction failed: ${response.status} ${response.statusText} - ${text}`
      );
    }

    const data = await response.json().catch(() => ({}));
    console.log('Transaction recorded successfully:', data);
    return true;
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}


