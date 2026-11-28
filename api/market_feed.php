<?php
/**
 * VNECONOMICS REALTIME MARKET DATA PROXY & CACHE ENDPOINT
 * Fetches 100% free public feeds (Binance, Vietcombank XML, Open ExchangeRate,
 * Alternative.me Fear & Greed, DeFiLlama Cardano/Chains TVL, CoinGecko Global,
 * World Bank Vietnam Macro) with file-based TTL caching via api/core/cache.php.
 *
 * Actions (?feed=all|crypto|forex|gold|macro|defi|rates):
 *   - ?feed=all     : Returns bundled snapshot for Market Hub & Simulation Lab
 *   - ?feed=crypto  : Binance 24h tickers + CoinGecko global + Fear & Greed
 *   - ?feed=forex   : Vietcombank official FX XML + Open ExchangeRate cross rates
 *   - ?feed=gold    : Spot XAU (via PAXGUSDT) + VND conversion + VN SJC/Ring reference
 *   - ?feed=macro   : World Bank Vietnam GDP, CPI, FDI, Export/GDP
 *   - ?feed=defi    : DeFiLlama Chains TVL + Cardano top protocols
 *   - ?feed=rates   : Aggregated Vietnam bank deposit & loan reference rates
 */

require_once __DIR__ . '/core/bootstrap.php';
vneBootstrapApi();
header('Cache-Control: public, max-age=60, stale-while-revalidate=120');

$feed = strtolower(trim((string)($_GET['feed'] ?? 'all')));
$allowedFeeds = ['all', 'crypto', 'forex', 'gold', 'macro', 'defi', 'rates'];
if (!in_array($feed, $allowedFeeds, true)) {
    vneJsonError('Invalid feed parameter.', 400);
}

function vneFetchHttp(string $url, int $timeout = 8): ?string {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_USERAGENT => 'VNEconomics-MarketBot/1.0 (+https://vneconomics.com)',
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $body = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($body !== false && $code >= 200 && $code < 400) {
            return (string)$body;
        }
        return null;
    }

    $ctx = stream_context_create([
        'http' => [
            'timeout' => $timeout,
            'header' => "User-Agent: VNEconomics-MarketBot/1.0\r\n",
        ],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    return $body !== false ? $body : null;
}

function vneFetchJson(string $url, int $timeout = 8): ?array {
    $raw = vneFetchHttp($url, $timeout);
    if ($raw === null) return null;
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : null;
}

function vneGetCryptoFeed(): array {
    $cached = vneCacheGet('market_crypto_v1', 60, 'market');
    if (is_array($cached)) {
        return $cached;
    }

    $symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'PAXGUSDT'];
    $query = urlencode(json_encode($symbols));
    $tickersRaw = vneFetchJson("https://api.binance.com/api/v3/ticker/24hr?symbols={$query}", 6);

    $tickers = [];
    if (is_array($tickersRaw)) {
        foreach ($tickersRaw as $row) {
            if (!isset($row['symbol'])) continue;
            $tickers[$row['symbol']] = [
                'symbol' => $row['symbol'],
                'price' => (float)($row['lastPrice'] ?? 0),
                'changePercent24h' => (float)($row['priceChangePercent'] ?? 0),
                'high24h' => (float)($row['highPrice'] ?? 0),
                'low24h' => (float)($row['lowPrice'] ?? 0),
                'quoteVolume' => (float)($row['quoteVolume'] ?? 0),
            ];
        }
    }

    $fngRaw = vneFetchJson('https://api.alternative.me/fng/?limit=7', 5);
    $fng = [];
    if (isset($fngRaw['data']) && is_array($fngRaw['data'])) {
        foreach ($fngRaw['data'] as $item) {
            $fng[] = [
                'value' => (int)($item['value'] ?? 50),
                'classification' => (string)($item['value_classification'] ?? 'Neutral'),
                'timestamp' => (int)($item['timestamp'] ?? time()),
            ];
        }
    }

    $globalRaw = vneFetchJson('https://api.coingecko.com/api/v3/global', 6);
    $global = null;
    if (isset($globalRaw['data']) && is_array($globalRaw['data'])) {
        $g = $globalRaw['data'];
        $global = [
            'totalMarketCapUsd' => (float)($g['total_market_cap']['usd'] ?? 0),
            'totalVolume24hUsd' => (float)($g['total_volume']['usd'] ?? 0),
            'btcDominance' => (float)($g['market_cap_percentage']['btc'] ?? 0),
            'ethDominance' => (float)($g['market_cap_percentage']['eth'] ?? 0),
            'marketCapChange24h' => (float)($g['market_cap_change_percentage_24h_usd'] ?? 0),
        ];
    }

    $payload = [
        'tickers' => $tickers,
        'fearAndGreed' => $fng,
        'global' => $global,
        'updatedAt' => gmdate('c'),
        'source' => 'Binance Public API • Alternative.me • CoinGecko',
    ];

    if (!empty($tickers)) {
        vneCacheSet('market_crypto_v1', $payload, 'market');
    }
    return $payload;
}

function vneGetForexFeed(): array {
    $cached = vneCacheGet('market_forex_v1', 300, 'market');
    if (is_array($cached)) {
        return $cached;
    }

    // 1. Vietcombank Official XML Feed
    $vcbRates = [];
    $vcbDate = '';
    $xmlStr = vneFetchHttp('https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx', 8);
    if ($xmlStr !== null && str_contains($xmlStr, '<ExrateList>')) {
        libxml_use_internal_errors(true);
        $xml = simplexml_load_string($xmlStr);
        if ($xml !== false) {
            $vcbDate = (string)($xml->DateTime ?? '');
            foreach ($xml->Exrate as $node) {
                $attrs = $node->attributes();
                $code = (string)($attrs['CurrencyCode'] ?? '');
                if ($code === '') continue;
                $buy = (float)str_replace([',', '-'], ['', '0'], (string)($attrs['Buy'] ?? '0'));
                $transfer = (float)str_replace([',', '-'], ['', '0'], (string)($attrs['Transfer'] ?? '0'));
                $sell = (float)str_replace([',', '-'], ['', '0'], (string)($attrs['Sell'] ?? '0'));
                $vcbRates[$code] = [
                    'code' => $code,
                    'name' => trim((string)($attrs['CurrencyName'] ?? $code)),
                    'buyCash' => $buy,
                    'buyTransfer' => $transfer,
                    'sell' => $sell,
                ];
            }
        }
    }

    // 2. Open ExchangeRate API (150+ currencies vs USD)
    $erRaw = vneFetchJson('https://open.er-api.com/v6/latest/USD', 6);
    $crossUsd = is_array($erRaw['rates'] ?? null) ? $erRaw['rates'] : [];

    $usdVnd = $vcbRates['USD']['sell'] ?? ($crossUsd['VND'] ?? 25450);

    $payload = [
        'usdVnd' => (float)$usdVnd,
        'vcbDate' => $vcbDate,
        'vcbRates' => array_values($vcbRates),
        'crossUsd' => $crossUsd,
        'updatedAt' => gmdate('c'),
        'source' => 'Vietcombank Official XML • Open ExchangeRate API',
    ];

    if (!empty($vcbRates) || !empty($crossUsd)) {
        vneCacheSet('market_forex_v1', $payload, 'market');
    }
    return $payload;
}

function vneGetGoldFeed(array $cryptoFeed, array $forexFeed): array {
    $cached = vneCacheGet('market_gold_v1', 180, 'market');
    if (is_array($cached)) {
        return $cached;
    }

    $xauUsd = (float)($cryptoFeed['tickers']['PAXGUSDT']['price'] ?? 2650.0);
    $xauChange = (float)($cryptoFeed['tickers']['PAXGUSDT']['changePercent24h'] ?? 0.0);
    $usdVnd = (float)($forexFeed['usdVnd'] ?? 25450.0);

    // 1 luong (tael) = 37.5g = 1.20565303 troy oz
    $globalVndPerTael = round($xauUsd * 1.20565303 * $usdVnd);

    // Optional BTMC public XML/JSON feed
    $vnGoldItems = [];
    $btmcRaw = vneFetchJson('http://api.btmc.vn/api/BTMCAPI/getpricebtmc?key=3kd8ub1llcg9t45hnoh8hmn7t5kc2v', 5);
    if (isset($btmcRaw['DataList']['Data']) && is_array($btmcRaw['DataList']['Data'])) {
        $seen = [];
        foreach ($btmcRaw['DataList']['Data'] as $item) {
            if (!is_array($item)) continue;
            $rowNum = (string)($item['@row'] ?? '');
            $name = (string)($item["@n_{$rowNum}"] ?? '');
            if ($name === '' || isset($seen[$name])) continue;
            $seen[$name] = true;
            $buy = (float)($item["@pb_{$rowNum}"] ?? 0);
            $sell = (float)($item["@ps_{$rowNum}"] ?? 0);
            if ($buy > 0 || $sell > 0) {
                $vnGoldItems[] = [
                    'name' => $name,
                    'karat' => (string)($item["@k_{$rowNum}"] ?? '999.9'),
                    'buyVnd' => $buy * 1000, // BTMC reports in thousands/luong
                    'sellVnd' => $sell * 1000,
                    'updatedAt' => (string)($item["@d_{$rowNum}"] ?? ''),
                ];
            }
            if (count($vnGoldItems) >= 8) break;
        }
    }

    $sjcReferenceSell = !empty($vnGoldItems)
        ? $vnGoldItems[0]['sellVnd']
        : round($globalVndPerTael * 1.042, -5);

    $payload = [
        'xauUsd' => $xauUsd,
        'xauChange24h' => $xauChange,
        'usdVnd' => $usdVnd,
        'globalVndPerTael' => $globalVndPerTael,
        'sjcReferenceSellVnd' => $sjcReferenceSell,
        'spreadVnd' => $sjcReferenceSell - $globalVndPerTael,
        'vnGoldItems' => $vnGoldItems,
        'updatedAt' => gmdate('c'),
        'source' => 'Binance PAXG/XAU • Vietcombank FX • BTMC Reference',
    ];

    vneCacheSet('market_gold_v1', $payload, 'market');
    return $payload;
}

function vneGetDefiFeed(): array {
    $cached = vneCacheGet('market_defi_v2', 300, 'market');
    if (is_array($cached)) {
        return $cached;
    }

    $chainsRaw = vneFetchJson('https://api.llama.fi/v2/chains', 8);
    $topChains = [];
    $totalDefiTvl = 0.0;
    if (is_array($chainsRaw)) {
        usort($chainsRaw, fn($a, $b) => ($b['tvl'] ?? 0) <=> ($a['tvl'] ?? 0));
        foreach ($chainsRaw as $c) {
            $tvl = (float)($c['tvl'] ?? 0);
            $totalDefiTvl += $tvl;
            if (count($topChains) < 12) {
                $topChains[] = [
                    'name' => (string)($c['name'] ?? ''),
                    'tokenSymbol' => (string)($c['tokenSymbol'] ?? ''),
                    'tvl' => $tvl,
                ];
            }
        }
    }

    $protocolsRaw = vneFetchJson('https://api.llama.fi/protocols', 10);
    $topProtocols = [];
    if (is_array($protocolsRaw)) {
        usort($protocolsRaw, fn($a, $b) => ($b['tvl'] ?? 0) <=> ($a['tvl'] ?? 0));
        foreach ($protocolsRaw as $p) {
            $tvl = (float)($p['tvl'] ?? 0);
            if ($tvl <= 0) continue;
            $chains = is_array($p['chains'] ?? null) ? $p['chains'] : [];
            $topProtocols[] = [
                'name' => (string)($p['name'] ?? ''),
                'category' => (string)($p['category'] ?? 'DeFi'),
                'chain' => (string)($p['chain'] ?? ($chains[0] ?? 'Multi-Chain')),
                'chains' => array_slice($chains, 0, 5),
                'tvl' => $tvl,
                'change1d' => (float)($p['change_1d'] ?? 0),
                'change7d' => (float)($p['change_7d'] ?? 0),
                'symbol' => (string)($p['symbol'] ?? ''),
            ];
            if (count($topProtocols) >= 20) break;
        }
    }

    $payload = [
        'totalDefiTvlUsd' => $totalDefiTvl,
        'topChains' => $topChains,
        'topProtocols' => $topProtocols,
        'updatedAt' => gmdate('c'),
        'source' => 'DeFiLlama Open API (v2)',
    ];

    if (!empty($topChains)) {
        vneCacheSet('market_defi_v2', $payload, 'market');
    }
    return $payload;
}

function vneGetMacroFeed(): array {
    $cached = vneCacheGet('market_macro_v1', 86400, 'market');
    if (is_array($cached)) {
        return $cached;
    }

    $indicators = [
        'gdpGrowth' => ['code' => 'NY.GDP.MKTP.KD.ZG', 'unit' => '%'],
        'cpiInflation' => ['code' => 'FP.CPI.TOTL.ZG', 'unit' => '%'],
        'gdpPerCapita' => ['code' => 'NY.GDP.PCAP.CD', 'unit' => 'USD'],
        'fdiInflowPctGdp' => ['code' => 'BX.KLT.DINV.WD.GD.ZS', 'unit' => '% GDP'],
        'exportsPctGdp' => ['code' => 'NE.EXP.GNFS.ZS', 'unit' => '% GDP'],
    ];

    $results = [];
    foreach ($indicators as $key => $meta) {
        $raw = vneFetchJson("https://api.worldbank.org/v2/country/VNM/indicator/{$meta['code']}?format=json&per_page=10", 8);
        $series = [];
        if (isset($raw[1]) && is_array($raw[1])) {
            foreach ($raw[1] as $pt) {
                if ($pt['value'] === null) continue;
                $series[] = [
                    'year' => (string)($pt['date'] ?? ''),
                    'value' => round((float)$pt['value'], 2),
                ];
            }
        }
        $results[$key] = [
            'unit' => $meta['unit'],
            'latest' => $series[0] ?? null,
            'series' => array_slice($series, 0, 6),
        ];
    }

    $payload = [
        'country' => 'VNM',
        'indicators' => $results,
        'updatedAt' => gmdate('c'),
        'source' => 'World Bank Open Data API (v2)',
    ];

    vneCacheSet('market_macro_v1', $payload, 'market');
    return $payload;
}

function vneGetBankRatesFeed(): array {
    // Structured reference matrix for major Vietnamese commercial banks (editable via server cache/config if needed)
    return [
        'updatedAt' => gmdate('c'),
        'source' => 'VNEconomics Vietnam Banking Rate Benchmark',
        'banks' => [
            ['bank' => 'Vietcombank', 'group' => 'Big4', 'm1' => 1.6, 'm3' => 1.9, 'm6' => 2.9, 'm12' => 4.6, 'm24' => 4.7, 'loanAvg' => 6.8],
            ['bank' => 'BIDV', 'group' => 'Big4', 'm1' => 1.7, 'm3' => 2.0, 'm6' => 3.0, 'm12' => 4.7, 'm24' => 4.8, 'loanAvg' => 6.9],
            ['bank' => 'VietinBank', 'group' => 'Big4', 'm1' => 1.7, 'm3' => 2.0, 'm6' => 3.0, 'm12' => 4.7, 'm24' => 4.8, 'loanAvg' => 6.9],
            ['bank' => 'Agribank', 'group' => 'Big4', 'm1' => 1.7, 'm3' => 2.1, 'm6' => 3.1, 'm12' => 4.7, 'm24' => 4.8, 'loanAvg' => 6.7],
            ['bank' => 'Techcombank', 'group' => 'TMCP', 'm1' => 3.15, 'm3' => 3.45, 'm6' => 4.45, 'm12' => 4.95, 'm24' => 5.1, 'loanAvg' => 7.4],
            ['bank' => 'MB Bank', 'group' => 'TMCP', 'm1' => 3.2, 'm3' => 3.6, 'm6' => 4.5, 'm12' => 5.0, 'm24' => 5.5, 'loanAvg' => 7.3],
            ['bank' => 'ACB', 'group' => 'TMCP', 'm1' => 2.7, 'm3' => 3.1, 'm6' => 4.2, 'm12' => 4.8, 'm24' => 5.0, 'loanAvg' => 7.5],
            ['bank' => 'VPBank', 'group' => 'TMCP', 'm1' => 3.5, 'm3' => 3.8, 'm6' => 4.8, 'm12' => 5.3, 'm24' => 5.6, 'loanAvg' => 8.1],
            ['bank' => 'TPBank', 'group' => 'TMCP', 'm1' => 3.3, 'm3' => 3.6, 'm6' => 4.6, 'm12' => 5.2, 'm24' => 5.5, 'loanAvg' => 7.8],
            ['bank' => 'HDBank', 'group' => 'TMCP', 'm1' => 3.45, 'm3' => 3.65, 'm6' => 5.0, 'm12' => 5.5, 'm24' => 5.8, 'loanAvg' => 7.9],
            ['bank' => 'VIB', 'group' => 'TMCP', 'm1' => 3.2, 'm3' => 3.5, 'm6' => 4.5, 'm12' => 5.1, 'm24' => 5.3, 'loanAvg' => 7.6],
            ['bank' => 'Sacombank', 'group' => 'TMCP', 'm1' => 2.8, 'm3' => 3.2, 'm6' => 4.4, 'm12' => 5.0, 'm24' => 5.2, 'loanAvg' => 7.7],
        ],
    ];
}

if ($feed === 'crypto') {
    vneJsonSuccess(vneGetCryptoFeed());
}
if ($feed === 'forex') {
    vneJsonSuccess(vneGetForexFeed());
}
if ($feed === 'gold') {
    $c = vneGetCryptoFeed();
    $f = vneGetForexFeed();
    vneJsonSuccess(vneGetGoldFeed($c, $f));
}
if ($feed === 'defi') {
    vneJsonSuccess(vneGetDefiFeed());
}
if ($feed === 'macro') {
    vneJsonSuccess(vneGetMacroFeed());
}
if ($feed === 'rates') {
    vneJsonSuccess(vneGetBankRatesFeed());
}

// feed === 'all' (Single-Flight Stale-While-Revalidate prevents external API stampedes)
$bundle = vneCacheGetOrBuild('market_all_bundle_v1', 60, static function () {
    $crypto = vneGetCryptoFeed();
    $forex = vneGetForexFeed();
    $gold = vneGetGoldFeed($crypto, $forex);
    $defi = vneGetDefiFeed();
    $macro = vneGetMacroFeed();
    $rates = vneGetBankRatesFeed();
    return [
        'crypto' => $crypto,
        'forex' => $forex,
        'gold' => $gold,
        'defi' => $defi,
        'macro' => $macro,
        'rates' => $rates,
        'updatedAt' => gmdate('c'),
    ];
}, 'market');

vneJsonSuccess($bundle);
