import s from "./LightStreaks.module.css";

/**
 * Two diagonal glow beams behind hero content. Static blur, animated only
 * via transform/opacity so it stays cheap during scroll.
 */
export function LightStreaks() {
  return (
    <div className={s.wrap} aria-hidden="true">
      <div className={`${s.beam} ${s.beamOne}`} />
      <div className={`${s.beam} ${s.beamTwo}`} />
    </div>
  );
}
