/* eslint-disable @next/next/no-img-element */
import { isTerminal } from "@/lib/game/engine";
import { computeLayout, COL_W, NODE_H, NODE_W, ROW_H } from "./treeLayout";

const SPEAKER_ICON = { char: "👩", player: "🙂", narr: "📜" };

function Node({ page, xy, isRoot, terminal, onOpen }) {
  const preview = (page.text || "").trim() || "（セリフ未入力）";
  return (
    <div
      className={"tc-node" + (xy.orphan ? " tc-node-orphan" : "")}
      style={{ left: xy.x, top: xy.y, width: NODE_W, minHeight: NODE_H }}
      onClick={() => onOpen(page.id)}
    >
      <div className="tc-node-head">
        <span>{isRoot ? "🏁 START" : SPEAKER_ICON[page.speaker] || "👩"}</span>
        {terminal && <span title="エンディング">🏆</span>}
      </div>
      <div className="tc-node-body">
        {page.media && page.media.url ? (
          page.media.type === "video" ? (
            <video src={page.media.url} muted className="tc-thumb" />
          ) : (
            <img src={page.media.url} alt="" className="tc-thumb" />
          )
        ) : null}
        <span className="tc-node-text">{preview.length > 26 ? preview.slice(0, 26) + "…" : preview}</span>
      </div>
      {terminal && page.ending && <div className="tc-node-ending">{page.ending}</div>}
    </div>
  );
}

export default function TreeCanvas({ pages, rootId, onOpen }) {
  const { pos, treeEdges, mergeEdges, orphans, width, height } = computeLayout(pages, rootId);
  const byId = new Map(pages.map((p) => [p.id, p]));
  const cx = (id) => pos.get(id).x + NODE_W;
  const cyMid = (id) => pos.get(id).y + NODE_H / 2;
  const cxLeft = (id) => pos.get(id).x;

  const linePath = (from, to, dashed) => {
    const x1 = cx(from), y1 = cyMid(from), x2 = cxLeft(to), y2 = cyMid(to);
    const mx = (x1 + x2) / 2;
    return <path key={from + ">" + to} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} stroke={dashed ? "#a45a35" : "#33473a"} strokeWidth={dashed ? 1.5 : 2} fill="none" strokeDasharray={dashed ? "5 4" : undefined} markerEnd="url(#tcArrow)" />;
  };

  return (
    <div className="tc-scroll">
      <div className="tc-canvas" style={{ width, height }}>
        <svg width={width} height={height} className="tc-svg">
          <defs>
            <marker id="tcArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 z" fill="#33473a" />
            </marker>
          </defs>
          {treeEdges.map((e) => linePath(e.from, e.to, false))}
          {mergeEdges.map((e, i) => (
            <g key={"m" + i}>{linePath(e.from, e.to, true)}</g>
          ))}
          {treeEdges
            .filter((e) => e.label)
            .map((e, i) => {
              const x = (cx(e.from) + cxLeft(e.to)) / 2;
              const y = (cyMid(e.from) + cyMid(e.to)) / 2;
              return (
                <text key={"lb" + i} x={x} y={y - 6} textAnchor="middle" className="tc-edge-label">
                  {e.label}
                </text>
              );
            })}
        </svg>

        {[...pos.keys()].map((id) => (
          <Node key={id} page={byId.get(id)} xy={pos.get(id)} isRoot={id === rootId} terminal={isTerminal(pages, byId.get(id))} onOpen={onOpen} />
        ))}
      </div>

      {orphans.length > 0 && (
        <p className="hint" style={{ margin: "8px 0 0", position: "relative", zIndex: 1 }}>
          ⚠ どこからも繋がっていないページが{orphans.length}件あります（下にオレンジ枠で表示。不要なら削除してください）
        </p>
      )}
    </div>
  );
}
