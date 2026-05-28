import QRCode from "qrcode";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { View } from "react-native";

function buildMatrix(value: string) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const cells: boolean[][] = [];
  for (let y = 0; y < n; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < n; x++) {
      row.push(Boolean(qr.modules.get(x, y)));
    }
    cells.push(row);
  }
  return { cells, n };
}

/** QR without react-native-svg (avoids Node `buffer` polyfill issues in Metro). */
export function QrCodeView({
  value,
  size = 220,
  dark = "#1a1a1a",
  light = "#ffffff",
}: {
  value: string;
  size?: number;
  dark?: string;
  light?: string;
}) {
  const matrix = useMemo(() => buildMatrix(value), [value]);
  const cellSize = size / matrix.n;
  const rows = useMemo(() => {
    const out: ReactNode[] = [];
    for (let y = 0; y < matrix.n; y++) {
      const cells: ReactNode[] = [];
      for (let x = 0; x < matrix.n; x++) {
        const filled = matrix.cells[y]?.[x] ?? false;
        cells.push(
          <View
            key={`qr-${y}-${x}`}
            style={{
              width: cellSize,
              height: cellSize,
              backgroundColor: filled ? dark : light,
            }}
          />,
        );
      }
      out.push(
        <View key={`qr-row-${y}`} style={{ flexDirection: "row", height: cellSize }}>
          {cells}
        </View>,
      );
    }
    return out;
  }, [matrix, cellSize, dark, light]);

  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: light,
        overflow: "hidden",
      }}
    >
      {rows}
    </View>
  );
}
