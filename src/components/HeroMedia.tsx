import s from "./HeroMedia.module.css";

export interface HeroMediaProps {
  /** Swap in a looping product video later; falls back to an animated gradient placeholder. */
  videoSrc?: string;
}

export function HeroMedia({ videoSrc }: HeroMediaProps) {
  if (videoSrc) {
    return (
      <video className={s.media} src={videoSrc} autoPlay loop muted playsInline aria-hidden="true" />
    );
  }

  return (
    <div className={s.placeholder} aria-hidden="true">
      <div className={s.blobOne} />
      <div className={s.blobTwo} />
    </div>
  );
}
