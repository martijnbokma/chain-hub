/** Compact toast list: a few items inline, longer lists capped vertical with "+N more". */
export function ToastItemList({ items, max = 6 }: { items: string[]; max?: number }) {
  if (items.length <= 3) {
    return <>{items.join(', ')}</>;
  }
  const shown = items.slice(0, max);
  const hidden = items.length - shown.length;
  return (
    <span className="flex flex-col gap-0.5">
      {shown.map((item) => (
        <span key={item}>{item}</span>
      ))}
      {hidden > 0 ? <span>+{hidden} more</span> : null}
    </span>
  );
}
