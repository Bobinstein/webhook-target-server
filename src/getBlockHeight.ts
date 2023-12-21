// getBlockHeight.ts

import Arweave from 'arweave';

// Initialize Arweave
const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https'
});

/**
 * Function to get the block height for a given transaction ID in Arweave.
 * @param txId - The transaction ID to query.
 * @param parentId - The parent ID to query if txId fails.
 * @param retries - Number of retries for fetching the block height.
 * @returns The block height as a number or undefined if not found after retries.
 */
export async function getBlockHeight(txId: string, parentId?: string, retries: number = 3): Promise<number | undefined> {
  while (retries >= 0) {
    try {
      let response = await arweave.transactions.getStatus(txId);
      if (response.confirmed) {
        return response.confirmed.block_height;
      } else if (parentId) {
        response = await arweave.transactions.getStatus(parentId);
        if (response.confirmed) {
          return response.confirmed.block_height;
        }
      }
      if (retries === 0) {
        console.log('Transaction or parent transaction not yet confirmed or does not exist.');
        return undefined;
      }
      retries--;
      await new Promise(resolve => setTimeout(resolve, 2000)); // wait for 2 seconds before retrying
    } catch (error) {
      console.error('Error fetching transaction status:', error);
      if (retries === 0) {
        return undefined;
      }
      retries--;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return undefined; // Should not reach here, but added for safety
}
