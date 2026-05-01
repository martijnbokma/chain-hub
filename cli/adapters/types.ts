export interface IdeLink {
  from: string
  to: string
  description: string
}

export interface IdeAdapter {
  name: string
  detect: () => boolean
  links: (chainHome: string) => IdeLink[]
}
