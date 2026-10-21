/**
 * Loads campaign data into the page once, then the runtime.
 * index.html references this file only. A failed boot leaves Level 1 playable.
 */
(function (root) {
  'use strict';
  if (root.__campaignBoot) return;
  root.__campaignBoot = 1;

  var files = [
    'src/campaign/CampaignTable.js',
    'src/campaign/ExitRules.js',
    'src/campaign/LevelMap.js',
    'src/campaign/L2.js',
    'src/campaign/L3.js',
    'src/campaign/L3Shell.js',
    'src/campaign/L3Webs.js',
    'src/campaign/OgreCave.js',
    'src/campaign/L4.js',
    'src/campaign/L5.js',
    'src/campaign/L6.js',
    'src/campaign/L7.js',
    'src/campaign/L8.js',
    'src/campaign/L9.js',
    'src/campaign/L10.js',
    'src/combat/SpiderPoison.js',
    'src/campaign/CampaignRuntime.js'
  ];

  function bust(url) {
    var ver = '';
    if (typeof document !== 'undefined' && document.getElementsByTagName) {
      var scripts = document.getElementsByTagName('script');
      for (var i = scripts.length - 1; i >= 0; i--) {
        var src = scripts[i].getAttribute('src') || '';
        if (src.indexOf('CampaignBoot.js') < 0) continue;
        var m = src.match(/[?&]v=([^&]+)/);
        if (m) ver = m[1];
        break;
      }
    }
    if (!ver && typeof ASSET_VER !== 'undefined' && ASSET_VER) ver = String(ASSET_VER);
    if (!ver) return url;
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + ver;
  }

  function xhr(url) {
    var req = new XMLHttpRequest();
    req.open('GET', bust(url), false);
    req.send(null);
    if (req.status && req.status !== 200) throw new Error(url + ' ' + req.status);
    return req.responseText;
  }

  try {
    for (var i = 0; i < files.length; i++) (0, eval)(xhr(files[i]));
    root.CampaignBook = JSON.parse(xhr('src/campaign/maps/campaign-levels.json'));
  } catch (err) {
    if (root.console && console.error) console.error('campaign boot failed', err);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
