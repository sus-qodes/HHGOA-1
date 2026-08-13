import logoUrl from "../assets/brand-kit/2-47.svg";

export function GeneratorHeader() {
  return (
    <header className="sticky top-0 z-50 bg-studio-green-dark text-studio-paper">
      <div className="mx-auto flex min-h-16 w-full items-center justify-between gap-5 px-4 py-1.5 sm:px-8 lg:px-14">
        <img src={logoUrl} alt="2:47PM Studio" className="h-10 w-auto sm:h-12" />

        <nav
          aria-label="Builder studio navigation"
          className="flex items-center gap-4 text-[0.62rem] font-medium uppercase tracking-[0.18em] sm:gap-6 sm:text-[0.7rem]"
        >
          <a
            className="hidden text-studio-paper transition-colors hover:text-studio-yellow md:inline"
            href="#pass-details"
          >
            How it works
          </a>
          <span
            aria-hidden="true"
            className="hidden h-6 w-px bg-studio-yellow md:block"
          />
          <span className="hidden text-studio-paper lg:inline">#FrameInGoa</span>
        </nav>
      </div>

      <div aria-hidden="true">
        <div className="h-[3px] bg-studio-yellow" />
        <div className="h-[2px] bg-studio-coral" />
        <div className="h-[2px] bg-studio-blue" />
      </div>
    </header>
  );
}
