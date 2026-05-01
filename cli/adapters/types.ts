export interface IdeLink {
  from: string
  to: string
  description: string
}

export interface IdeAdapter {
  name: string
  /** Optional product or docs URL shown in setup/status output */
  infoUrl?: string
  detect: () => boolean
  links: (chainHome: string) => IdeLink[]
}
