import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import { useApp } from "../../state.jsx";
import { ASSET_COLOR } from "../../theme";

/**
 * View 5, 3D mode — the correlation matrix as an interactive constellation.
 * Asset nodes orbit slowly; edge brightness/thickness encodes |ρ| and colour
 * encodes sign. Clicking a node switches the active asset; clicking an edge
 * drives the existing rolling-ρ drill-down (setPair). Functional 3D: the
 * scene IS the pair selector.
 */
const RADIUS = 2.1;

function Node({ symbol, position, active, onClick }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    const s = 1 + Math.sin(clock.elapsedTime * 2 + position[0]) * (active ? 0.1 : 0.04);
    ref.current.scale.setScalar(s);
  });
  return (
    <group position={position}>
      <mesh
        ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <sphereGeometry args={[active ? 0.24 : 0.16, 32, 32]} />
        <meshStandardMaterial
          color={ASSET_COLOR[symbol]}
          emissive={ASSET_COLOR[symbol]}
          emissiveIntensity={active ? 1.5 : 0.55}
        />
      </mesh>
      {/* Html labels: no font fetch, works offline (drei Text suspends on CDN fonts) */}
      <Html position={[0, 0.4, 0]} center style={{ pointerEvents: "none" }}>
        <span
          style={{
            color: "#c9d4e2",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            textShadow: "0 0 6px #0b0e14, 0 0 3px #0b0e14",
            whiteSpace: "nowrap",
          }}
        >
          {symbol}
        </span>
      </Html>
    </group>
  );
}

function Edge({ a, b, rho, selected, onSelect }) {
  if (rho == null) return null;
  const w = Math.abs(rho);
  return (
    <Line
      points={[a.pos, b.pos]}
      color={rho >= 0 ? (selected ? "#9ecbff" : "#58a6ff") : "#f85149"}
      transparent
      opacity={selected ? 0.95 : 0.12 + w * 0.7}
      lineWidth={(selected ? 2 : 0.5) + w * 4}
      onClick={(e) => {
        e.stopPropagation();
        onSelect([a.sym, b.sym]);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    />
  );
}

function Graph({ matrix, labels }) {
  const { asset, setAsset, pair, setPair } = useApp();
  const group = useRef();

  const nodes = useMemo(
    () =>
      labels.map((sym, i) => {
        const t = (i / labels.length) * Math.PI * 2 - Math.PI / 2;
        return {
          sym,
          pos: [Math.cos(t) * RADIUS, Math.sin(t) * RADIUS * 0.62, Math.sin(t * 2) * 0.45],
        };
      }),
    [labels]
  );

  useFrame((_, dt) => {
    group.current.rotation.y += dt * 0.07;
  });

  const isSelected = (x, y) =>
    pair && ((pair[0] === x && pair[1] === y) || (pair[0] === y && pair[1] === x));

  return (
    <group ref={group}>
      {nodes.map((n) => (
        <Node
          key={n.sym}
          symbol={n.sym}
          position={n.pos}
          active={n.sym === asset}
          onClick={() => setAsset(n.sym)}
        />
      ))}
      {nodes.flatMap((a, i) =>
        nodes.slice(i + 1).map((b, jOff) => {
          const j = i + 1 + jOff;
          return (
            <Edge
              key={`${a.sym}-${b.sym}`}
              a={a}
              b={b}
              rho={matrix[i]?.[j]}
              selected={isSelected(a.sym, b.sym)}
              onSelect={setPair}
            />
          );
        })
      )}
    </group>
  );
}

export default function CorrelationConstellation({ matrix, labels }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5.1], fov: 45 }}
      style={{ height: 210, borderRadius: 8 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.45} />
      <pointLight position={[4, 4, 6]} intensity={0.9} />
      <pointLight position={[-4, -3, 4]} intensity={0.35} color="#58a6ff" />
      <Graph matrix={matrix} labels={labels} />
    </Canvas>
  );
}
