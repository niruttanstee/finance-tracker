export async function getCurrentBalance(): Promise<{ balance: number; currency: string }> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/balance`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch balance');
  }
  
  return response.json();
}
