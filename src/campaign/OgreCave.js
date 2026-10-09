/**
 * L4 ogre cave set piece (Nick decision 13, rules 1.4). Data only.
 * Not loaded by index.html.
 *
 * Orcs hold an ogress behind boulders. Clearing the boulders makes her
 * flee. She never fights. Golden eggs are in the cave.
 */
(function (root) {
  'use strict';

  var OGRE_CAVE = {
    id: 'ogre-cave',
    level: 4,
    holders: 'orcs',
    boulders: { count: 3, secondsEach: 10, action: 'dig-clear' },
    prisoner: {
      key: 'ogress',
      name: 'Ogress',
      hd: '4+1',
      ac: 5,
      mv: 9,
      fights: false,
      hostile: false,
      targetable: false,
      onBouldersCleared: 'flee',
      flee: { along: 'scripted-path', despawnAt: 'exit-tile' },
      rescueXp: 185
    },
    goldenEggs: {
      count: 3,
      buff: 'egg',
      acDelta: -4,
      battles: 1,
      sellGp: 50
    },
    loot: { ogreCorpses: false, ogreLoot: false },
    wired: false
  };

  function fleeScript(cave) {
    var piece = cave || OGRE_CAVE;
    if (piece.prisoner.fights) return { flees: false, reason: 'she fights' };
    if (piece.prisoner.onBouldersCleared !== 'flee') return { flees: false, reason: 'no flee' };
    return {
      flees: true,
      afterBoulders: piece.boulders.count,
      fights: false,
      targetable: false,
      xp: piece.prisoner.rescueXp,
      eggs: piece.goldenEggs.count
    };
  }

  var api = { OGRE_CAVE: OGRE_CAVE, fleeScript: fleeScript, wired: false };
  root.OgreCave = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
