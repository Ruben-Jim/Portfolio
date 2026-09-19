/**
 * Post builder — undo / redo over JSON snapshots of the design. Pure, no DOM.
 * Call checkpoint(current) before a change; undo/redo return the snapshot to restore.
 */
export function createHistory(limit) {
  var max = limit || 50;
  var past = [];
  var future = [];

  return {
    checkpoint: function (snapshot) {
      if (past.length && past[past.length - 1] === snapshot) return;
      past.push(snapshot);
      if (past.length > max) past.shift();
      future.length = 0;
    },
    undo: function (current) {
      if (!past.length) return null;
      future.push(current);
      return past.pop();
    },
    redo: function (current) {
      if (!future.length) return null;
      past.push(current);
      return future.pop();
    },
    canUndo: function () { return past.length > 0; },
    canRedo: function () { return future.length > 0; },
    clear: function () { past.length = 0; future.length = 0; }
  };
}
