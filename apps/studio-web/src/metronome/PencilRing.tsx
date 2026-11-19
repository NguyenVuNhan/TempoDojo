/** The orange pencil loop that marks the live note: 5px stroke, 7px on the downbeat (see DESIGN.md). */
export function PencilRing({ downbeat }: { downbeat: boolean }) {
  return (
    <svg className="pencil-ring" data-downbeat={downbeat} viewBox="0 0 100 100" aria-hidden focusable="false">
      <path d="M50 7 C77 6 95 25 93 51 C91 78 71 94 46 92 C20 90 5 71 8 46 C10 24 27 9 55 9" />
    </svg>
  );
}
