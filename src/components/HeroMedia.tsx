import s from "./HeroMedia.module.css";
import heroPhoto from "@/assets/photos/afro-pic-1.jpg";

export interface HeroMediaProps {
  /** Swap in a looping product video later; falls back to the static photo. */
  videoSrc?: string;
}

export function HeroMedia({ videoSrc }: HeroMediaProps) {
  if (videoSrc) {
    return (
      <video className={s.media} src={videoSrc} autoPlay loop muted playsInline aria-hidden="true" />
    );
  }

  return (
    <img
      className={s.media}
      src={heroPhoto}
      alt="Portrait of a woman with a defined, healthy natural curl pattern"
    />
  );
}
