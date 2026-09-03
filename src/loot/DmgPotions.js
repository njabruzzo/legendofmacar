/**
 * AD&D 1e DMG Table III.A — Potions and Oils (d100).
 * RAW: treasure potion identity uses this table, not Unearthed Arcana
 * and not the campaign d10,000 kitchen-sink list.
 */
(function (root) {
  'use strict';

  var TABLE = [
    {a:1,b:3,n:'Animal Control',k:'animalctrl',d:'Control animals. Save vs spell. RAW 1e DMG.'},
    {a:4,b:6,n:'Clairaudience',k:'clairaud',d:'Hear as the spell. RAW 1e DMG.'},
    {a:7,b:9,n:'Clairvoyance',k:'clairvoy',d:'See as the spell. RAW 1e DMG.'},
    {a:10,b:12,n:'Climbing',k:'climb',d:'Climb as a thief for 5–8 turns. RAW 1e DMG.'},
    {a:13,b:15,n:'Delusion',k:'delusion',d:'Believed to be another potion. RAW 1e DMG.'},
    {a:16,b:18,n:'Diminution',k:'diminish',d:'Shrink to 5% size. RAW 1e DMG.'},
    {a:19,b:20,n:'Dragon Control',k:'dragonctrl',d:'Control a dragon type. RAW 1e DMG.'},
    {a:21,b:23,n:'ESP',k:'esp',d:'Read thoughts, 5d8 rounds. RAW 1e DMG.'},
    {a:24,b:26,n:'Extra-Healing',k:'extraheal',d:'3d8+3 hp if wholly drunk. RAW 1e DMG.'},
    {a:27,b:29,n:'Fire Resistance',k:'fireres',d:'+4 vs fire; half or no fire damage. RAW 1e DMG.'},
    {a:30,b:32,n:'Flying',k:'fly',d:'Fly as the spell. RAW 1e DMG.'},
    {a:33,b:34,n:'Gaseous Form',k:'gaseous',d:'Become gas. RAW 1e DMG.'},
    {a:35,b:36,n:'Giant Control',k:'giantctrl',d:'Control giants of a rolled type. RAW 1e DMG.'},
    {a:37,b:39,n:'Giant Strength',k:'giantstr',d:'Strength of a giant. RAW 1e DMG.'},
    {a:40,b:41,n:'Growth',k:'growth',d:'Grow to giant size; double damage. RAW 1e DMG.'},
    {a:42,b:47,n:'Healing',k:'heal',d:'2d4+2 hp if wholly drunk. RAW 1e DMG.'},
    {a:48,b:49,n:'Heroism',k:'heroism',d:'Fighter gains temporary HD. RAW 1e DMG.'},
    {a:50,b:51,n:'Human Control',k:'humanctrl',d:'Control humans or humanoids. RAW 1e DMG.'},
    {a:52,b:54,n:'Invisibility',k:'invis',d:'Invisible until attacking. RAW 1e DMG.'},
    {a:55,b:57,n:'Invulnerability',k:'invuln',d:'+2 saves; ignore +2 or lesser weapons. RAW 1e DMG.'},
    {a:58,b:60,n:'Levitation',k:'levitate',d:'Levitate as the spell. RAW 1e DMG.'},
    {a:61,b:63,n:'Longevity',k:'longevity',d:'Reverse 1–12 years of age. RAW 1e DMG.'},
    {a:64,b:66,n:'Oil of Etherealness',k:'ethereal',d:'Become ethereal. RAW 1e DMG.'},
    {a:67,b:69,n:'Oil of Slipperiness',k:'slip',d:'Cannot be grabbed or webbed. RAW 1e DMG.'},
    {a:70,b:72,n:'Philter of Love',k:'love',d:'Charm the first seen. RAW 1e DMG.'},
    {a:73,b:75,n:'Philter of Persuasiveness',k:'persua',d:'Suggestion once; better reactions. RAW 1e DMG.'},
    {a:76,b:78,n:'Plant Control',k:'plantctrl',d:'Control plants or fungi. RAW 1e DMG.'},
    {a:79,b:81,n:'Polymorph Self',k:'polymorph',d:'Change shape as the spell. RAW 1e DMG.'},
    {a:82,b:84,n:'Poison',k:'poison',d:'Save vs poison or die. A sip is enough. RAW 1e DMG.'},
    {a:85,b:86,n:'Speed',k:'haste',d:'Haste; ages the drinker 1 year. RAW 1e DMG.'},
    {a:87,b:89,n:'Super-Heroism',k:'superhero',d:'Greater heroism HD. RAW 1e DMG.'},
    {a:90,b:92,n:'Sweet Water',k:'sweetwater',d:'Purifies liquid; clears poison. RAW 1e DMG.'},
    {a:93,b:94,n:'Treasure Finding',k:'treasure',d:'Points to the largest treasure. RAW 1e DMG.'},
    {a:95,b:96,n:'Undead Control',k:'undeadctrl',d:'Control undead. RAW 1e DMG.'},
    {a:97,b:100,n:'Water Breathing',k:'waterbreath',d:'Breathe water as air. RAW 1e DMG.'}
  ];

  function byRoll(roll) {
    roll = roll|0;
    if (roll <= 0) roll = 1;
    if (roll > 100) roll = 100;
    var i, row;
    for (i = 0; i < TABLE.length; i++) {
      row = TABLE[i];
      if (roll >= row.a && roll <= row.b) return row;
    }
    return TABLE[TABLE.length - 1];
  }

  function isHealName(n) {
    n = String(n || '');
    return /^(Potion of )?(Healing|Extra-Healing)$/i.test(n);
  }

  function isHeal(p) {
    if (!p) return false;
    var k = p.k || '';
    if (k === 'heal' || k === 'extraheal' || k === 'heal10' || k === 'heal20' || k === 'heal40' || k === 'healall') return true;
    return isHealName(p.n);
  }

  function names() {
    return TABLE.map(function (r) { return r.n; });
  }

  root.DmgPotions = {
    TABLE: TABLE,
    byRoll: byRoll,
    isHeal: isHeal,
    isHealName: isHealName,
    names: names
  };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
