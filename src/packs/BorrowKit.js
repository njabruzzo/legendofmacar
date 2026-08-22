/**
 * Kin pack loans: Macar may share anything an NPC holds.
 * Used or carried loans return to the owner after camp.
 */
(function (root) {
  'use strict';

  function isNpc(key) {
    return !!(key && key !== 'macar');
  }

  function cloneItem(it) {
    if (!it || typeof it !== 'object') return it;
    var o = {};
    for (var k in it) {
      if (!Object.prototype.hasOwnProperty.call(it, k)) continue;
      if (k === '_borrowOwner') continue;
      o[k] = it[k];
    }
    return o;
  }

  function mark(item, owner) {
    if (item && typeof item === 'object' && isNpc(owner)) item._borrowOwner = owner;
    return item;
  }

  function unmark(item) {
    if (item && item._borrowOwner) delete item._borrowOwner;
    return item;
  }

  function note(list, owner, spec) {
    spec = spec || {};
    if (!isNpc(owner)) return list || [];
    var out = (list || []).slice();
    out.push({
      owner: owner,
      field: spec.field || null,
      n: spec.n == null ? 1 : spec.n,
      slot: spec.slot || null,
      item: spec.item ? cloneItem(spec.item) : null,
      herb: spec.herb || null,
      held: !!spec.held
    });
    return out;
  }

  function ensurePackShape(pk) {
    if (!pk.potions) pk.potions = [];
    if (!pk.healPots) pk.healPots = [];
    if (!pk.magic) pk.magic = [];
    if (!pk.gems) pk.gems = [];
    if (!pk.herbs) pk.herbs = {};
    return pk;
  }

  function itemMatch(it, loan) {
    if (!it) return false;
    if (it._borrowOwner && it._borrowOwner === loan.owner) {
      if (!loan.item) return true;
      if (loan.item.n && it.n === loan.item.n) return true;
      if (loan.item.k && it.k === loan.item.k && it.n === loan.item.n) return true;
    }
    return false;
  }

  function takeTagged(pack, loan, equipped) {
    var slot = loan.slot;
    var arr = pack[slot];
    if (!arr || !arr.length) return null;
    for (var i = 0; i < arr.length; i++) {
      if (!itemMatch(arr[i], loan)) continue;
      var it = arr.splice(i, 1)[0];
      if (equipped) {
        ['weapon', 'armor', 'ring', 'wand'].forEach(function (s) {
          if (equipped[s] === it) equipped[s] = null;
        });
      }
      return unmark(it);
    }
    return null;
  }

  /**
   * Put every loan back on its NPC owner. Leftover shared stacks are
   * reclaimed from Macar so the same flask is not duplicated forever.
   */
  function restore(list, packs, equipped) {
    packs = packs || {};
    var mac = ensurePackShape(packs.macar || (packs.macar = {}));
    var returned = 0;
    (list || []).forEach(function (loan) {
      if (!loan || !isNpc(loan.owner)) return;
      var owner = ensurePackShape(packs[loan.owner] || (packs[loan.owner] = {}));
      var n = loan.n == null ? 1 : loan.n;
      if (loan.field) {
        owner[loan.field] = (owner[loan.field] || 0) + n;
        if (loan.held) {
          var have = mac[loan.field] || 0;
          var take = Math.min(have, n);
          if (take) mac[loan.field] = have - take;
        }
        returned++;
        return;
      }
      if (loan.herb) {
        if (loan.held && mac.herbs[loan.herb]) {
          mac.herbs[loan.herb]--;
          if (mac.herbs[loan.herb] <= 0) delete mac.herbs[loan.herb];
        }
        owner.herbs[loan.herb] = (owner.herbs[loan.herb] || 0) + n;
        returned++;
        return;
      }
      if (loan.slot && loan.item) {
        var held = takeTagged(mac, loan, equipped);
        owner[loan.slot] = owner[loan.slot] || [];
        owner[loan.slot].push(held || cloneItem(loan.item));
        returned++;
      }
    });
    return { packs: packs, equipped: equipped || null, returned: returned, borrowed: [] };
  }

  var BorrowKit = {
    isNpc: isNpc,
    cloneItem: cloneItem,
    mark: mark,
    unmark: unmark,
    note: note,
    restore: restore
  };

  root.BorrowKit = BorrowKit;
})(typeof window !== 'undefined' ? window : globalThis);
