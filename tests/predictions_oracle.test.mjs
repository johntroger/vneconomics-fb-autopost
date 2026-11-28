import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('Prediction Oracle PHP API and Migration 009 enforce security and atomic InnoDB locking', () => {
  const phpPath = path.join(root, 'api', 'predictions.php');
  const sqlPath = path.join(root, 'migrations', '009_predictions_oracle.sql');
  assert.ok(fs.existsSync(phpPath), 'api/predictions.php must exist');
  assert.ok(fs.existsSync(sqlPath), 'migrations/009_predictions_oracle.sql must exist');

  const php = fs.readFileSync(phpPath, 'utf8');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  assert.match(php, /hash_equals/, 'Admin endpoints must verify X-Admin-Token with hash_equals');
  assert.match(php, /LOCK_EX/, 'No-DB JSON fallback must use atomic flock(LOCK_EX)');
  assert.match(php, /->prepare\(/, 'MySQL queries must use PDO prepared statements');
  assert.match(php, /place_bet/, 'Must support atomic place_bet endpoint');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS vne_prediction_markets/, 'Migration must create vne_prediction_markets');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS vne_prediction_outcomes/, 'Migration must create vne_prediction_outcomes');
  assert.match(sql, /UNIQUE KEY uniq_pred_tx/, 'Positions table must enforce unique tx_hash anti-replay');
});

test('Prediction Oracle frontend modules & AdminPage moderation UI exist and wire AI Review Card', () => {
  const oracleTs = fs.readFileSync(path.join(root, 'src', 'features', 'predictions', 'predictionOracleService.ts'), 'utf8');
  const cardTsx = fs.readFileSync(path.join(root, 'src', 'features', 'predictions', 'AiPredictionReviewCard.tsx'), 'utf8');
  const adminTsx = fs.readFileSync(path.join(root, 'src', 'features', 'admin', 'AdminPage.tsx'), 'utf8');
  const marketTs = fs.readFileSync(path.join(root, 'src', 'features', 'predictions', 'predictionMarketService.ts'), 'utf8');

  assert.match(oracleTs, /validateNewMarketLocally/);
  assert.match(oracleTs, /runAiMarketModeration/);
  assert.match(oracleTs, /runAiOracleResolutionScan/);
  assert.match(oracleTs, /google_search/);

  assert.match(cardTsx, /AiMarketModerationEval/);
  assert.match(cardTsx, /AiOracleResolutionEval/);

  assert.match(adminTsx, /AiPredictionReviewCard/);
  assert.match(adminTsx, /runAiOracleResolutionScan/);
  assert.match(adminTsx, /approvePendingMarket/);
  assert.match(adminTsx, /resolveMarketOutcome/);

  assert.match(marketTs, /outcomeResults\?\.\[position\.outcomeId\]/);
});

test('High-concurrency scalability optimizations (SWR cache, sharded rate limit, SARGable SQL, light search index, 300ms WS throttle)', () => {
  const cachePhp = fs.readFileSync(path.join(root, 'api', 'core', 'cache.php'), 'utf8');
  const ratePhp = fs.readFileSync(path.join(root, 'api', 'core', 'rate_limit.php'), 'utf8');
  const dbPhp = fs.readFileSync(path.join(root, 'api', 'db.php'), 'utf8');
  const gamePhp = fs.readFileSync(path.join(root, 'api', 'game.php'), 'utf8');
  const postsPhp = fs.readFileSync(path.join(root, 'api', 'posts.php'), 'utf8');
  const headerTsx = fs.readFileSync(path.join(root, 'src', 'core', 'ui', 'Header.tsx'), 'utf8');
  const feedTs = fs.readFileSync(path.join(root, 'src', 'features', 'market', 'marketFeedService.ts'), 'utf8');
  const searchJsonPath = path.join(root, 'src', 'data', 'search-index.json');

  assert.match(cachePhp, /vneCacheGetOrBuild/);
  assert.match(cachePhp, /LOCK_EX \| LOCK_NB/);
  assert.match(cachePhp, /vneBufferPostView/);

  assert.match(ratePhp, /apcu_inc/);
  assert.match(ratePhp, /substr\(\$key, 0, 2\)/);

  assert.match(dbPhp, /\.schema_autopost_v2\.flag/);

  assert.doesNotMatch(gamePhp, /DATE\(created_at\)/);
  assert.doesNotMatch(gamePhp, /DATE\(settled_at\)/);

  assert.match(postsPhp, /vneBufferPostView/);

  assert.ok(fs.existsSync(searchJsonPath), 'Lightweight search-index.json must exist');
  assert.ok(fs.statSync(searchJsonPath).size < 200_000, 'search-index.json must stay lightweight (<200KB)');
  assert.match(headerTsx, /searchIndexService/);
  assert.doesNotMatch(headerTsx, /catalogService/);

  assert.match(feedTs, /setInterval\(flushTicks, 300\)/);
  assert.match(feedTs, /document\.hidden/);
});
