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
 * @returns The block height as a number or undefined if not found.
 */
export async function getBlockHeight(txId: string): Promise<number | undefined> {
  try {
    const response = await arweave.transactions.getStatus(txId);
    if (response.confirmed) {
      return response.confirmed.block_height;
    } else {
      console.log('Transaction not yet confirmed or does not exist.');
      return undefined;
    }
  } catch (error) {
    console.error('Error fetching transaction status:', error);
    return undefined;
  }
}
