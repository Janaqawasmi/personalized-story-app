import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { BOOK_COLORS } from "../book/bookTokens";

const GRID = 3;
const TILE = 70;

interface Props {
  coverImageUrl?: string;
}

export default function SlidingPuzzleActivity({ coverImageUrl }: Props) {
  const [tiles, setTiles] = useState<number[]>([]);

  const shuffle = () => {
    const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    let emptyPos = 8;
    for (let n = 0; n < 60; n++) {
      const r = Math.floor(emptyPos / GRID);
      const c = emptyPos % GRID;
      const options: number[] = [];
      if (r > 0) options.push(emptyPos - GRID);
      if (r < GRID - 1) options.push(emptyPos + GRID);
      if (c > 0) options.push(emptyPos - 1);
      if (c < GRID - 1) options.push(emptyPos + 1);
      const swap = options[Math.floor(Math.random() * options.length)]!;
      [arr[emptyPos], arr[swap]] = [arr[swap]!, arr[emptyPos]!];
      emptyPos = swap;
    }
    setTiles(arr);
  };

  useEffect(shuffle, []);

  const isSolved = tiles.length > 0 && tiles.every((v, i) => v === i);

  const tapTile = (pos: number) => {
    const emptyPos = tiles.indexOf(8);
    const r1 = Math.floor(pos / GRID);
    const c1 = pos % GRID;
    const r2 = Math.floor(emptyPos / GRID);
    const c2 = emptyPos % GRID;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;
    const next = [...tiles];
    [next[pos], next[emptyPos]] = [next[emptyPos]!, next[pos]!];
    setTiles(next);
  };

  return (
    <Box sx={{ display: "inline-block" }}>
      <Box
        sx={{
          width: GRID * TILE,
          height: GRID * TILE,
          position: "relative",
          mx: "auto",
          borderRadius: 2,
          overflow: "hidden",
          backgroundColor: BOOK_COLORS.parchmentDark,
        }}
      >
        {tiles.map((tileId, pos) => {
          const r = Math.floor(pos / GRID);
          const c = pos % GRID;
          if (tileId === 8) return null;
          const tr = Math.floor(tileId / GRID);
          const tc = tileId % GRID;
          return (
            <Box
              key={pos}
              onClick={() => tapTile(pos)}
              sx={{
                position: "absolute",
                top: r * TILE,
                left: c * TILE,
                width: TILE,
                height: TILE,
                cursor: "pointer",
                border: `1px solid ${BOOK_COLORS.inkMuted}`,
                backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : undefined,
                backgroundColor: coverImageUrl ? undefined : BOOK_COLORS.rose,
                backgroundSize: `${GRID * TILE}px ${GRID * TILE}px`,
                backgroundPosition: `-${tc * TILE}px -${tr * TILE}px`,
                transition: "top .18s ease, left .18s ease",
              }}
            />
          );
        })}
      </Box>
      <Typography sx={{ mt: 1.5, fontSize: 12.5, color: BOOK_COLORS.cream, textAlign: "center" }}>
        {isSolved ? "🎉" : ""}
      </Typography>
    </Box>
  );
}
