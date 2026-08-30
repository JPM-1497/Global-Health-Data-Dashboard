interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-surface-900/85 backdrop-blur-md">
      <div className="mx-auto max-w-screen-2xl px-3 py-3 sm:px-6 sm:py-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-400">
          Global Health Data Dashboard
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:mt-2 sm:text-3xl">
          {title}
        </h1>
      </div>
    </header>
  )
}
