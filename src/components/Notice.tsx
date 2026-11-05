import type { ComponentChildren } from "preact";

export function Warning({ children }: { children: ComponentChildren }) {
  return (
    <p class="bg-red/33 px-3 py-2 text-center font-mono text-sm text-black">
      ⚠️ Couldn't load {children}
    </p>
  );
}

export function Empty({ children }: { children: ComponentChildren }) {
  return <p class="text-center text-sm text-black">{children}</p>;
}
