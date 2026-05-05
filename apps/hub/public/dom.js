export function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (typeof text === "string") node.textContent = text
  return node
}
