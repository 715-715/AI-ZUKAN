import { resolveTarget } from "@/lib/game/engine";

export const COL_W = 190;
export const ROW_H = 108;
export const NODE_W = 168;
export const NODE_H = 84;

function linksOf(pages, page) {
  if ((page.choices || []).length) {
    return page.choices.map((c, i) => ({
      key: "c" + i,
      label: c.label || `選択肢${i + 1}`,
      target: resolveTarget(pages, page, c.next),
    }));
  }
  const t = resolveTarget(pages, page, page.after || "end");
  return t ? [{ key: "after", label: null, target: t }] : [];
}

/**
 * ページ配列 → ツリーレイアウト（座標つき）。
 * BFSで最初に辿り着いた経路を「木の枝」、2回目以降の参照を「合流／ループ」として分ける。
 */
export function computeLayout(pages, rootId) {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const depthOf = new Map();
  const columns = [];
  const treeEdges = [];
  const mergeEdges = [];

  if (byId.has(rootId)) {
    depthOf.set(rootId, 0);
    columns[0] = [rootId];
    const queue = [rootId];
    let qi = 0;
    while (qi < queue.length) {
      const id = queue[qi++];
      const page = byId.get(id);
      if (!page) continue;
      for (const link of linksOf(pages, page)) {
        if (!link.target) continue;
        if (!depthOf.has(link.target)) {
          const d = depthOf.get(id) + 1;
          depthOf.set(link.target, d);
          (columns[d] ||= []).push(link.target);
          treeEdges.push({ from: id, to: link.target, label: link.label });
          queue.push(link.target);
        } else {
          mergeEdges.push({ from: id, to: link.target, label: link.label });
        }
      }
    }
  }

  const pos = new Map();
  columns.forEach((col, depth) => {
    col.forEach((id, row) => {
      pos.set(id, { x: depth * COL_W, y: row * ROW_H, depth, row });
    });
  });

  const orphans = pages.filter((p) => !depthOf.has(p.id));
  orphans.forEach((p, i) => {
    pos.set(p.id, { x: 0, y: (columns[0]?.length || 0) * ROW_H + i * ROW_H, depth: -1, row: i, orphan: true });
  });

  const maxDepth = Math.max(0, ...columns.map((_, i) => i));
  const maxRows = Math.max(1, ...columns.map((c) => c.length), orphans.length ? (columns[0]?.length || 0) + orphans.length : 0);
  const width = (maxDepth + 1) * COL_W + NODE_W;
  const height = maxRows * ROW_H + NODE_H;

  return { pos, treeEdges, mergeEdges, orphans, width, height };
}
