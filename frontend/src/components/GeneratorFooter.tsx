export function GeneratorFooter() {
  return (
    <footer
      aria-label="Generator footer"
      className="generator-footer border-t border-studio-paper/20 bg-transparent text-studio-paper/60"
    >
      <div className="mx-auto flex w-full items-center justify-between gap-4 px-[clamp(1rem,3vw,3rem)] py-7 text-[0.62rem] uppercase tracking-[0.14em] sm:text-xs">
        <p>Built at : FOR THE STUDENTS</p>
        <p className="shrink-0">
          CHECKOUT: {" "}
          <a
            className="underline decoration-current/60 underline-offset-4 transition-colors hover:text-studio-paper focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-studio-yellow"
            href="https://hhgoa.com/"
            rel="noopener noreferrer"
            target="_blank"
          >
            https://hhgoa.com/
          </a>
        </p>
      </div>
    </footer>
  );
}
