export const BASE_SEPOLIA_CHAIN_ID_HEX = '0x14a34'; // 84532
export const ETHEREUM_SEPOLIA_CHAIN_ID_HEX = '0xaa36a7'; // 11155111
export const POLYGON_AMOY_CHAIN_ID_HEX = '0x13882'; // 80002
export const BSC_TESTNET_CHAIN_ID_HEX = '0x61'; // 97
export const ARBITRUM_SEPOLIA_CHAIN_ID_HEX = '0x66eee'; // 421614

export const SUPPORTED_TESTNET_CHAIN_IDS = [
  BASE_SEPOLIA_CHAIN_ID_HEX,
  ETHEREUM_SEPOLIA_CHAIN_ID_HEX,
  POLYGON_AMOY_CHAIN_ID_HEX,
  BSC_TESTNET_CHAIN_ID_HEX,
  ARBITRUM_SEPOLIA_CHAIN_ID_HEX,
];

// Chặn tuyệt đối các mạng Mainnet có tiền thật
export const KNOWN_MAINNET_CHAIN_IDS = ['0x1', '1', '0x38', '56', '0x89', '137', '0xa4b1', '42161', '0xa', '10', '0x2105', '8453'];

export const NETWORK_METADATA: Record<string, { name: string; symbol: string; explorerTxUrl: string }> = {
  '0x14a34': { name: 'Base Sepolia Testnet', symbol: 'ETH', explorerTxUrl: 'https://sepolia.basescan.org/tx/' },
  '0xaa36a7': { name: 'Ethereum Sepolia Testnet', symbol: 'ETH', explorerTxUrl: 'https://sepolia.etherscan.io/tx/' },
  '0x13882': { name: 'Polygon Amoy Testnet', symbol: 'POL', explorerTxUrl: 'https://amoy.polygonscan.com/tx/' },
  '0x61': { name: 'BNB Smart Chain Testnet', symbol: 'tBNB', explorerTxUrl: 'https://testnet.bscscan.com/tx/' },
  '0x66eee': { name: 'Arbitrum Sepolia Testnet', symbol: 'ETH', explorerTxUrl: 'https://sepolia.arbiscan.io/tx/' },
};

// Địa chỉ mặc định (cập nhật khi deploy contract lên từng Testnet)
export const VNE_CONTRACT_ADDRESSES: Record<string, { nft: string; vault: string }> = {
  '0x14a34': { nft: '', vault: '' },
  '0xaa36a7': { nft: '', vault: '' },
};

export const VNE_CERTIFICATE_NFT_ABI = [
  {
    type: 'function',
    name: 'mintCertificate',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'nftType', type: 'string' },
      { name: 'title', type: 'string' },
      { name: 'milestoneStage', type: 'uint8' },
      { name: 'sha256Proof', type: 'string' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'claimBookNFT',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'bookSlug', type: 'string' },
      { name: 'title', type: 'string' },
      { name: 'sha256Proof', type: 'string' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const VNE_DEFI_VAULT_ABI = [
  {
    type: 'function',
    name: 'stakeTokens',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'voteProposal',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'bool' },
    ],
    outputs: [],
  },
] as const;
