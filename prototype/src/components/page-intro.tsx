export function PageIntro({
  kicker,
  title,
  lede,
}: {
  kicker: string;
  title: string;
  lede: string;
}) {
  return (
    <header className="max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-widest text-water">{kicker}</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-ink sm:text-5xl">{title}</h1>
      <p className="mt-3 text-base text-muted">{lede}</p>
    </header>
  );
}
