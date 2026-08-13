/**
 * Interface icons — and only interface icons.
 *
 * A tab, a lock, a state: things the player reads as controls rather than as
 * objects in the world. Everything with a fiction behind it — a business, a
 * shift, a milestone — is a drawn asset in `Art.tsx` instead, because a 1.6px
 * outline is a label for a thing rather than a picture of one.
 *
 * Line drawings on a shared 24×24 grid carrying geometry and nothing else.
 * Stroke weight, caps and joins live in `base.css` on `.icon` and are
 * inherited; `currentColor` ties every icon to whatever contains it.
 */
import type { JSX } from 'preact';

const ICONS: Record<string, () => JSX.Element> = {
  ore: () => (
    <>
      <path d="M8.4 3.2h7.2l4.8 6.2L12 20.8 3.6 9.4z" />
      <path d="M3.6 9.4h16.8M8.4 3.2l-1.2 6.2L12 20.8l4.8-11.4-1.2-6.2" />
    </>
  ),
  skyline: () => (
    <>
      <path d="M2.6 20V10.8h5.2V20M7.8 20V4.4h7.2V20M15 20v-6.4h6.4V20" />
      <path d="M10.4 8h2M10.4 11.6h2M10.4 15.2h2M4.6 14h1.4" />
    </>
  ),
  chart: () => (
    <>
      <path d="M2.8 17.6 9 11.2l3.8 3.8 8.4-8.4" />
      <path d="M15 6.6h6.2v6.2" />
    </>
  ),
  heart: () => (
    <>
      <path d="M12 20.4s-7.8-4.9-7.8-10.2A4.4 4.4 0 0 1 12 7.2a4.4 4.4 0 0 1 7.8 3C19.8 15.5 12 20.4 12 20.4Z" />
    </>
  ),
  lock: () => (
    <>
      <rect x="4.4" y="10" width="15.2" height="10.6" rx="2.6" />
      <path d="M8 10V7.4a4 4 0 0 1 8 0V10" />
      <path d="M12 14v2.6" />
    </>
  ),
};

export function Icon({ name, class: className }: { name: string; class?: string }) {
  const draw = ICONS[name];
  if (!draw) return null;

  return (
    <svg class={`icon${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" aria-hidden="true">
      {draw()}
    </svg>
  );
}
