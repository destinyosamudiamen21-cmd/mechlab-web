const LINE = "#dbe6f5";
const MARK = "#f2a900";

const LABELS = {
  mohr: "Mohr's circle with a rotated stress element",
  pv: "Pressure-volume diagram with the work area shaded",
  beam: "Simply supported beam with a point load",
};

// Each course gets a drawing of the idea students meet in it.
export default function CourseArt({ code }: { code: string }) {
  const kind = code.includes("332")
    ? "mohr"
    : code.includes("351")
    ? "pv"
    : "beam";

  return (
    <svg
      className='course-art'
      viewBox='0 0 320 140'
      role='img'
      aria-label={LABELS[kind]}
    >
      <g
        fill='none'
        stroke={LINE}
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
        fontSize='13'
      >
        {kind === "mohr" && (
          <>
            <line x1='24' y1='70' x2='296' y2='70' />
            <line x1='96' y1='16' x2='96' y2='124' />
            <circle cx='176' cy='70' r='46' />
            <line
              x1='138.3'
              y1='96.4'
              x2='213.7'
              y2='43.6'
              strokeDasharray='4 4'
            />
            <rect
              x='254'
              y='24'
              width='26'
              height='26'
              transform='rotate(18 267 37)'
            />
            <circle cx='222' cy='70' r='3' fill={LINE} stroke='none' />
            <circle cx='130' cy='70' r='3' fill={LINE} stroke='none' />
            <circle cx='213.7' cy='43.6' r='4.5' fill={MARK} stroke='none' />
            <text x='300' y='64' fill={LINE} stroke='none'>
              σ
            </text>
            <text x='103' y='24' fill={LINE} stroke='none'>
              τ
            </text>
          </>
        )}

        {kind === "pv" && (
          <>
            <path
              d='M70 26 Q112 92 270 104 L270 120 L70 120 Z'
              fill={MARK}
              fillOpacity='0.28'
              stroke='none'
            />
            <line x1='44' y1='14' x2='44' y2='120' />
            <line x1='44' y1='120' x2='300' y2='120' />
            <path d='M70 26 Q112 92 270 104' />
            <circle cx='70' cy='26' r='4' fill={LINE} stroke='none' />
            <circle cx='270' cy='104' r='4' fill={LINE} stroke='none' />
            <text x='28' y='22' fill={LINE} stroke='none'>
              p
            </text>
            <text x='304' y='124' fill={LINE} stroke='none'>
              V
            </text>
            <text x='150' y='112' fill={MARK} stroke='none'>
              W
            </text>
          </>
        )}

        {kind === "beam" && (
          <>
            <line x1='50' y1='70' x2='270' y2='70' strokeWidth='3' />
            <path d='M50 72 L40 92 L60 92 Z' />
            <path d='M270 72 L260 92 L280 92 Z' />
            <path d='M50 70 Q160 98 270 70' strokeDasharray='4 4' />
            <line x1='160' y1='22' x2='160' y2='62' stroke={MARK} />
            <path d='M153 54 L160 64 L167 54' stroke={MARK} />
          </>
        )}
      </g>
    </svg>
  );
}
