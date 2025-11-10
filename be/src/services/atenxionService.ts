import axios from 'axios';
import { fetchLatestIntegrationEmbed } from './localMongoService.js';

const ATENXION_API_URL =
  process.env.ATENXION_API_URL || 'https://api-qa.atenxion.ai';

export async function recordAtenxionTransaction(
  studentId: string,
  token?: string | null
): Promise<boolean> {
  const url = `${ATENXION_API_URL}/api/post-login/new-transaction`;

  const body = {
    userId: studentId.trim(),
  };

  let atenxionToken = '';

  try {
    const latest = await fetchLatestIntegrationEmbed();
    console.log('Latest integration embed:', latest);
    const embeddedToken = (latest as any)?.contextKey as string | undefined;
    console.log('Embedded token:', embeddedToken);
    if (embeddedToken && embeddedToken.trim().length > 0) {
      atenxionToken = embeddedToken.trim();
    }
  } catch {
    atenxionToken = 'asdf';
  }
console.log('Atenxion token:', atenxionToken);
  const headers = {
    Authorization: `Bearer ${atenxionToken}`,
    'Content-Type': 'application/json',
  };

  try {
    console.log('Atenxion transaction API call:', {
      url,
      body,
      token:
        atenxionToken 
          ? `${(atenxionToken ).substring(0, 16)}...`
          : 'none',
    });
    const response = await axios.post(url, body, { headers });
    const data = response?.data ?? {};
    console.log('Transaction recorded successfully:', data);
    return true;
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}


