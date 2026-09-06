/**
 * Classic-script adaptation of rot.js Path / A* (no type="module").
 *
 * Source: https://github.com/ondras/rot.js
 * Commit: 46782e248c2db9d379a5e4f13bb8323f18dff04b
 * Files:  lib/constants.js (DIRS only), lib/path/path.js, lib/path/astar.js
 *
 * Copyright (c) 2012-now(), Ondrej Zara
 * SPDX-License-Identifier: BSD-3-Clause
 * See LICENSE in this directory. Redistributions must retain the copyright
 * notice, conditions, and disclaimer.
 *
 * Algorithm text follows the pinned files. Host Navigation.js bounds
 * expansions; this file does not add a time budget.
 */
(function (root) {
  'use strict';

  /* DIRS from lib/constants.js @ 46782e2 */
  var DIRS = {
    4: [[0, -1], [1, 0], [0, 1], [-1, 0]],
    8: [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]],
    6: [[-1, -1], [1, -1], [2, 0], [1, 1], [-1, 1], [-2, 0]]
  };

  /**
   * @class Abstract pathfinder
   * @see rot.js lib/path/path.js
   */
  function Path(toX, toY, passableCallback, options) {
    options = options || {};
    this._toX = toX;
    this._toY = toY;
    this._passableCallback = passableCallback;
    this._options = Object.assign({
      topology: 8
    }, options);
    this._dirs = DIRS[this._options.topology];
    if (this._options.topology == 8) { /* reorder dirs for more aesthetic result (vertical/horizontal first) */
      this._dirs = [
        this._dirs[0],
        this._dirs[2],
        this._dirs[4],
        this._dirs[6],
        this._dirs[1],
        this._dirs[3],
        this._dirs[5],
        this._dirs[7]
      ];
    }
  }

  Path.prototype._getNeighbors = function (cx, cy) {
    var result = [];
    var i, dir, x, y;
    for (i = 0; i < this._dirs.length; i++) {
      dir = this._dirs[i];
      x = cx + dir[0];
      y = cy + dir[1];
      if (!this._passableCallback(x, y)) {
        continue;
      }
      result.push([x, y]);
    }
    return result;
  };

  /**
   * @class Simplified A* algorithm: all edges have a value of 1
   * @see rot.js lib/path/astar.js
   */
  function AStar(toX, toY, passableCallback, options) {
    Path.call(this, toX, toY, passableCallback, options || {});
    this._todo = [];
    this._done = {};
  }

  AStar.prototype = Object.create(Path.prototype);
  AStar.prototype.constructor = AStar;

  AStar.prototype.compute = function (fromX, fromY, callback) {
    this._todo = [];
    this._done = {};
    this._fromX = fromX;
    this._fromY = fromY;
    this._add(this._toX, this._toY, null);
    while (this._todo.length) {
      var item = this._todo.shift();
      var id = item.x + "," + item.y;
      if (id in this._done) {
        continue;
      }
      this._done[id] = item;
      if (item.x == fromX && item.y == fromY) {
        break;
      }
      var neighbors = this._getNeighbors(item.x, item.y);
      for (var i = 0; i < neighbors.length; i++) {
        var neighbor = neighbors[i];
        var x = neighbor[0];
        var y = neighbor[1];
        id = x + "," + y;
        if (id in this._done) {
          continue;
        }
        this._add(x, y, item);
      }
    }
    item = this._done[fromX + "," + fromY];
    if (!item) {
      return;
    }
    while (item) {
      callback(item.x, item.y);
      item = item.prev;
    }
  };

  AStar.prototype._add = function (x, y, prev) {
    var h = this._distance(x, y);
    var obj = {
      x: x,
      y: y,
      prev: prev,
      g: (prev ? prev.g + 1 : 0),
      h: h
    };
    /* insert into priority queue */
    var f = obj.g + obj.h;
    for (var i = 0; i < this._todo.length; i++) {
      var item = this._todo[i];
      var itemF = item.g + item.h;
      if (f < itemF || (f == itemF && h < item.h)) {
        this._todo.splice(i, 0, obj);
        return;
      }
    }
    this._todo.push(obj);
  };

  AStar.prototype._distance = function (x, y) {
    switch (this._options.topology) {
      case 4:
        return (Math.abs(x - this._fromX) + Math.abs(y - this._fromY));
      case 6: {
        var dx = Math.abs(x - this._fromX);
        var dy = Math.abs(y - this._fromY);
        return dy + Math.max(0, (dx - dy) / 2);
      }
      case 8:
        return Math.max(Math.abs(x - this._fromX), Math.abs(y - this._fromY));
    }
  };

  root.ROT = root.ROT || {};
  root.ROT.DIRS = DIRS;
  root.ROT.Path = root.ROT.Path || {};
  root.ROT.Path.AStar = AStar;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
