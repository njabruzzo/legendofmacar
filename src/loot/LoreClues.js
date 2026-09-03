/**
 * Walk-over mundane scraps from Book I majors.
 * Not magic. Coins-always and printed magic % are separate.
 */
(function (root) {
  'use strict';

  var CLUES = {
    spider_lord: {
      n: 'Torn Spinneret',
      d: 'The silk runs down a crack no goblin dug. Whatever drinks the drums is under the last web.'
    },
    goblin_king: {
      n: 'Stolen Throne-Nail',
      d: 'A dwarf nail from under the seat. The throne is a lid. Something breathes when the fat one sits.'
    },
    goblin_warlord: {
      n: 'Split Drum-Skin',
      d: 'The beat comes up through the floor. They feed it so it does not climb.'
    },
    goblin_chieftain: {
      n: 'Warm-Air Token',
      d: 'Clay, black on one side, still warm. Things go in. Air comes out.'
    },
    goblin_boss: {
      n: 'Painted Chip',
      d: 'A flake of red mine-paint. The true dark starts where the paint stops.'
    },
    kobold_chief: {
      n: 'Crooked Tally-Stick',
      d: 'Notches past the last goblin mark. One notch has no tribe. The dark keeps going.'
    },
    shaman: {
      n: "Maglubiyet's Tooth",
      d: 'A yellow tooth on a thong. It hums over any floor that is thinner than it looks.'
    }
  };

  function clueKey(e) {
    if (!e) return '';
    var name = e.name || '';
    if (name === 'Thin One' || e.kind === 'statue' || e.rubyDrop) return '';
    if (name === 'RUBY WARDEN' || e.kind === 'warden') return '';
    if (name === 'Spider Lord' || (e.boss && e.kind === 'spider')) return 'spider_lord';
    if (name === 'Goblin King') return 'goblin_king';
    if (name === 'Goblin Warlord') return 'goblin_warlord';
    if (name === 'Goblin Chieftain') return 'goblin_chieftain';
    if (name === 'Goblin Boss') return 'goblin_boss';
    if (name === 'Kobold Chief') return 'kobold_chief';
    if (e.shaman || name === 'Goblin Shaman') return 'shaman';
    return '';
  }

  function forEntity(e) {
    var key = clueKey(e);
    if (!key || !CLUES[key]) return null;
    var row = CLUES[key];
    return { n: row.n, d: row.d, k: 'clue', mundane: 1, clueKey: key };
  }

  function attach(pile, e) {
    pile = pile || {};
    var clue = forEntity(e);
    if (!clue) return pile;
    pile.items = (pile.items || []).slice();
    var has = pile.items.some(function (it) { return it && it.k === 'clue' && it.n === clue.n; });
    if (!has) pile.items.push(clue);
    return pile;
  }

  root.LoreClues = {
    CLUES: CLUES,
    clueKey: clueKey,
    forEntity: forEntity,
    attach: attach
  };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
