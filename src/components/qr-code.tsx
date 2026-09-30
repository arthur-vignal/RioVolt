"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * QR Code visual placeholder.
 *
 * Não é um QR real — não escaneável. É uma matriz 25x25 com finder patterns
 * (3 quadrados nos cantos) e dados pseudo-aleatórios derivados de `value`,
 * suficiente pra demonstrar o visual do componente na tela de iniciar carga.
 *
 * Para um QR real, plugar `qrcode` (~30kb) e trocar a implementação interna.
 */

const SIZE = 25;
const FINDER = 7; // tamanho dos 3 finder patterns

type Props = {
  /** string a ser codificada visualmente (ex: bookingId) */
  value: string;
  className?: string;
  /** tamanho em pixels (quadrado) */
  size?: number;
};

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function fillFinder(matrix: boolean[][]) {
  // Top-left
  drawFinder(matrix, 0, 0);
  // Top-right
  drawFinder(matrix, 0, SIZE - FINDER);
  // Bottom-left
  drawFinder(matrix, SIZE - FINDER, 0);
}

function drawFinder(matrix: boolean[][], r: number, c: number) {
  for (let i = 0; i < FINDER; i++) {
    for (let j = 0; j < FINDER; j++) {
      const onBorder = i === 0 || j === 0 || i === FINDER - 1 || j === FINDER - 1;
      const inner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
      matrix[r + i][c + j] = onBorder || inner;
    }
  }
  // Limpa a "linha" entre finder e o conteúdo (1 quadrado de respiro)
  if (c === 0 && r === 0) matrix[FINDER][7] = false;
  if (c === SIZE - FINDER && r === 0) matrix[FINDER][SIZE - FINDER - 1] = false;
  if (c === 0 && r === SIZE - FINDER) matrix[SIZE - FINDER - 1][7] = false;
}

function fillData(matrix: boolean[][], seed: number) {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s;
  };
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      // Pula finder patterns e respiro
      if (isReserved(r, c)) continue;
      matrix[r][c] = (rand() % 2) === 0;
    }
  }
}

function isReserved(r: number, c: number): boolean {
  // Top-left finder + separator
  if (r < FINDER + 1 && c < FINDER + 1) return true;
  // Top-right finder + separator
  if (r < FINDER + 1 && c >= SIZE - FINDER - 1) return true;
  // Bottom-left finder + separator
  if (r >= SIZE - FINDER - 1 && c < FINDER + 1) return true;
  // Timing patterns (linhas cheias a cada 8 entre finders)
  if (r === 6 && c >= 8 && c <= SIZE - 9) return false;
  if (c === 6 && r >= 8 && r <= SIZE - 9) return false;
  return false;
}

export function QrCode({ value, className, size = 240 }: Props) {
  const matrix = useMemo(() => {
    const m: boolean[][] = Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => false),
    );
    fillFinder(m);
    fillData(m, hash(value || "voltrio"));
    return m;
  }, [value]);

  const cell = size / SIZE;
  const cells: { x: number; y: number; key: string }[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (matrix[r][c]) {
        cells.push({ x: c * cell, y: r * cell, key: `${r}-${c}` });
      }
    }
  }

  return (
    <svg
      role="img"
      aria-label={`QR Code do agendamento ${value}`}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={cn(
        "rounded-[6px] border border-black/10 bg-white p-2",
        className,
      )}
    >
      <rect width={size} height={size} fill="white" />
      {cells.map(({ x, y, key }) => (
        <rect key={key} x={x} y={y} width={cell} height={cell} fill="#000000" />
      ))}
      {/* Logo central placeholder — quadrado vazado só pra ocupar espaço */}
      <rect
        x={size / 2 - cell * 2.5}
        y={size / 2 - cell * 2.5}
        width={cell * 5}
        height={cell * 5}
        fill="white"
        stroke="#000000"
        strokeWidth={cell * 0.4}
        rx={cell * 0.6}
      />
      <text
        x={size / 2}
        y={size / 2 + cell * 0.8}
        fontFamily="monospace"
        fontSize={cell * 2.4}
        fill="#16a34a"
        textAnchor="middle"
        fontWeight={700}
      >
        V
      </text>
    </svg>
  );
}
