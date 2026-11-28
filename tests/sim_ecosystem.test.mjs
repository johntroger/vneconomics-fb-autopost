import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

test('Sim ecosystem configures official EVM & Cardano Testnet treasury wallets and anti-replay swap', () => {
  const svc = fs.readFileSync(path.join(ROOT, 'src/features/sim/simLabsService.ts'), 'utf8');
  assert.ok(svc.includes('0x1A81221CF769d8C3398b168Dc974D945ef9F0C26'));
  assert.ok(svc.includes('addr_test1qqseqvzja43nym3lgx5axlan8vx6s4eefrz49d4j5058up88qycgf9g0klaaf4v02hg2neq4njqp8u670hg27nel52eql9d023'));
  assert.match(svc, /executeTestnetSwap/);
  assert.match(svc, /DAILY_SWAP_CAP_VNE = 500/);

  const gamePhp = fs.readFileSync(path.join(ROOT, 'api/game.php'), 'utf8');
  assert.match(gamePhp, /action === 'testnet_swap'/);
  assert.match(gamePhp, /TX_ALREADY_REDEEMED/);

  const app = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
  assert.match(app, /path="\/mo-phong\/testnet-swap\/\*"/);
  assert.match(app, /path="\/mo-phong\/:labSlug\/\*"/);

  const header = fs.readFileSync(path.join(ROOT, 'src/core/ui/Header.tsx'), 'utf8');
  assert.match(header, /SIM_MENU_ITEMS/);
  assert.match(header, /simOpen/);
});

test('DeFi Staking and DAO Voting enforce on-chain Testnet execution with bonus VNE Points', () => {
  const svc = fs.readFileSync(path.join(ROOT, 'src/features/sim/simLabsService.ts'), 'utf8');
  assert.match(svc, /recordOnChainDefiStake/);
  assert.match(svc, /harvestOnChainDefiStake/);
  assert.match(svc, /recordOnChainDaoVote/);
  assert.match(svc, /recordOnChainDaoProposal/);

  const walletSvc = fs.readFileSync(path.join(ROOT, 'src/features/web3/multiChainWalletService.ts'), 'utf8');
  assert.match(walletSvc, /executeEvmTestnetOnChainAction/);
  assert.match(walletSvc, /executeCardanoTestnetOnChainAction/);
});
