/**
 * Book I major hail keys. Quill owns the lines — they live in NPC_TALK.
 * Trigger: Speak or first aggro, once per entity.
 */
(function (root) {
  'use strict';

  var KEYS = [
    'spider_lord', 'goblin_king', 'goblin_warlord', 'goblin_chieftain',
    'goblin_boss', 'kobold_chief', 'shaman_steel'
  ];

  function talkKey(e, flags) {
    if (!e || e.dead) return '';
    var name = e.name || '';
    if (name === 'Thin One' || e.kind === 'statue' || e.rubyDrop) return '';
    if (name === 'RUBY WARDEN' || e.kind === 'warden') return '';
    if (name === 'Spider Lord' || (e.boss && e.kind === 'spider')) return 'spider_lord';
    if (name === 'Goblin King') return 'goblin_king';
    if (name === 'Goblin Warlord') return 'goblin_warlord';
    if (name === 'Goblin Chieftain') return 'goblin_chieftain';
    if (name === 'Goblin Boss') return 'goblin_boss';
    if (name === 'Kobold Chief') return 'kobold_chief';
    if (e.shaman || name === 'Goblin Shaman') {
      if (flags && flags.shamanHailed) return '';
      return 'shaman_steel';
    }
    return '';
  }

  function isMajorTalker(e, flags) {
    return !!talkKey(e, flags);
  }

  root.MajorTalk = {
    KEYS: KEYS,
    talkKey: talkKey,
    isMajorTalker: isMajorTalker
  };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
