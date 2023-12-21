import Arweave from 'arweave';

// Initialize Arweave
const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https'
});

/**
 * Function to get the block height for a given transaction ID or parent ID in Arweave.
 * @param txId - The transaction ID to query.
 * @param parentId - The parent ID to query if txId fails.
 * @returns The block height as a number or undefined if not found.
 */
export async function getBlockHeight(txId: string, parentId?: string): Promise<number | undefined> {
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
    console.log('Transaction or parent transaction not yet confirmed or does not exist.');
    return undefined;
  } catch (error) {
    console.error('Error fetching transaction status:', error);
    return undefined;
  }
}
