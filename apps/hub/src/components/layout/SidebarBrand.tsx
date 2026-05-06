export function SidebarBrand() {
  return (
    <div className="flex min-w-0 items-center gap-[0.7rem]">
      <img
        className="block size-9 shrink-0"
        src="/chain-hub-logo.svg"
        width={36}
        height={36}
        alt=""
        decoding="async"
      />
      <div className="min-w-0 flex-1 [&_strong]:block [&_strong]:font-hub-display [&_strong]:text-[0.95rem] [&_strong]:tracking-wide [&_strong]:text-[#f5f8ff]">
        <strong>Chain Hub</strong>
      </div>
    </div>
  )
}
