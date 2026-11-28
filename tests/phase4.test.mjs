import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

test('Phase 4 smart contracts enforce 0đ Testnet design and ERC-721 metadata', () => {
  const vault = fs.readFileSync(path.join(ROOT, 'contracts', 'VNEDeFiVault.sol'), 'utf8');
  const nft = fs.readFileSync(path.join(ROOT, 'contracts', 'VNECertificateNFT.sol'), 'utf8');

  assert.ok(vault.includes('stakeTokens') && vault.includes('voteProposal'), 'VNEDeFiVault missing staking or DAO voting');
  assert.ok(nft.includes('mintCertificate') && nft.includes('upgradeMilestone'), 'VNECertificateNFT missing mint/upgrade');
  assert.ok(nft.includes('sha256Proof'), 'VNECertificateNFT missing SHA-256 proof field');
});

test('Phase 4 Multi-chain wallet blocks Mainnet and supports Cardano CIP-30', () => {
  const walletSrc = fs.readFileSync(path.join(ROOT, 'src', 'features', 'web3', 'multiChainWalletService.ts'), 'utf8');
  const abiSrc = fs.readFileSync(path.join(ROOT, 'src', 'features', 'web3', 'contractsAbi.ts'), 'utf8');

  assert.ok(walletSrc.includes('isMainnetDanger'), 'Missing Mainnet danger guard');
  assert.ok(walletSrc.includes('window.cardano'), 'Missing Cardano CIP-30 adapter');
  assert.ok(walletSrc.includes('mintTestnetNft'), 'Missing NFT mint function');
  assert.ok(abiSrc.includes('KNOWN_MAINNET_CHAIN_IDS'), 'Missing Mainnet blocklist');
});

test('Phase 4 SEO/GEO/AEO PHP endpoints & Autopost bridge exist with required headers and schemas', () => {
  const ssr = fs.readFileSync(path.join(ROOT, 'api', 'ssr_render.php'), 'utf8');
  const sitemap = fs.readFileSync(path.join(ROOT, 'api', 'sitemap.php'), 'utf8');
  const llms = fs.readFileSync(path.join(ROOT, 'api', 'llms.php'), 'utf8');
  const nftApi = fs.readFileSync(path.join(ROOT, 'api', 'nft.php'), 'utf8');
  const nftMeta = fs.readFileSync(path.join(ROOT, 'api', 'nft_metadata.php'), 'utf8');
  const autopostSync = fs.readFileSync(path.join(ROOT, 'api', 'local_autopost_sync.php'), 'utf8');

  assert.ok(ssr.includes('Vary: User-Agent'), 'ssr_render.php missing Vary: User-Agent');
  assert.ok(ssr.includes('application/ld+json'), 'ssr_render.php missing JSON-LD');
  assert.ok(ssr.includes('FROM redirects'), 'ssr_render.php missing 301 redirect lookup');
  assert.ok(sitemap.includes('sitemapindex'), 'sitemap.php missing sitemapindex');
  assert.ok(llms.includes('5 Trụ cột Tri thức'), 'llms.php missing pillar links');
  assert.ok(nftApi.includes('nft_mint_vouchers'), 'nft.php missing voucher nonce anti-replay');
  assert.ok(nftMeta.includes('SHA256 Proof'), 'nft_metadata.php missing SHA256 Proof attribute');
  assert.ok(autopostSync.includes('social_post_queue'), 'local_autopost_sync.php missing queue insert');
  assert.ok(fs.existsSync(path.join(ROOT, 'scripts', 'enrich-aeo-batch.mjs')), 'Missing AEO batch enrichment script');
});
