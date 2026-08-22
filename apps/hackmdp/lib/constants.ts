export const HIDDEN_PLACEHOLDER = '**** **** **** ****'
export const COLORS = [
  'brand',
  'scale',
  'tomato',
  'red',
  'crimson',
  'pink',
  'purple',
  'violet',
  'indigo',
  'blue',
  'green',
  'grass',
  'orange',
  'sky',
  'yellow',
  'amber',
  'gold',
  'gray',
  'slate',
]
export type AvailableColors =
  | 'brand'
  | 'brandAlt'
  | 'scale'
  | 'tomato'
  | 'red'
  | 'crimson'
  | 'pink'
  | 'purple'
  | 'violet'
  | 'indigo'
  | 'blue'
  | 'green'
  | 'grass'
  | 'orange'
  | 'sky'
  | 'yellow'
  | 'amber'
  | 'gold'
  | 'gray'
  | 'slate'

export const SIZE = {
  text: {
    tiny: 'text-[11px]',
    small: 'text-[13px] leading-4',
    medium: 'text-[13px]',
    large: 'text-[14px]',
    xlarge: 'text-[14px]',
  },
  padding: {
    tiny: 'px-2 py-1',
    small: 'px-3 py-1.5',
    medium: 'px-4 py-2',
    large: 'px-5 py-2.5',
    xlarge: 'px-6 py-3',
  },
  height: {
    tiny: 'h-[28px]',
    small: 'h-[32px]',
    medium: 'h-[36px]',
    large: 'h-[40px]',
    xlarge: 'h-[48px]',
  },
}

// used for internal badges/buttons
// such as Button Group Items or Multi Select items
export const SIZE_INNER = {
  text: {
    tiny: 'text-[10px]',
    small: 'text-[11px] leading-4',
    medium: 'text-[13px]',
    large: 'text-[13px]',
    xlarge: 'text-[14px]',
  },
  padding: {
    tiny: 'px-2 py-0.5',
    small: 'px-3 py-1',
    medium: 'px-4 py-1.5',
    large: 'px-5 py-2',
    xlarge: 'px-6 py-2.5',
  },
  height: {
    tiny: 'h-[24px]',
    small: 'h-[28px]',
    medium: 'h-[32px]',
    large: 'h-[36px]',
    xlarge: 'h-[40px]',
  },
}

export const SIZE_VARIANTS = {
  tiny: `${SIZE.text['tiny']} ${SIZE.padding['tiny']} ${SIZE.height['tiny']}`,
  small: `${SIZE.text['small']} ${SIZE.padding['small']} ${SIZE.height['small']}`,
  medium: `${SIZE.text['medium']} ${SIZE.padding['medium']} ${SIZE.height['medium']}`,
  large: `${SIZE.text['large']} ${SIZE.padding['large']} ${SIZE.height['large']}`,
  xlarge: `${SIZE.text['xlarge']} ${SIZE.padding['xlarge']} ${SIZE.height['xlarge']}`,
  // Aliases for Shadcn compatibility
  sm: `${SIZE.text['small']} ${SIZE.padding['small']} ${SIZE.height['small']}`,
  md: `${SIZE.text['medium']} ${SIZE.padding['medium']} ${SIZE.height['medium']}`,
  lg: `${SIZE.text['large']} ${SIZE.padding['large']} ${SIZE.height['large']}`,
  xl: `${SIZE.text['xlarge']} ${SIZE.padding['xlarge']} ${SIZE.height['xlarge']}`,
  icon: 'p-2 h-9 w-9',
}

export const SIZE_VARIANTS_INNER = {
  tiny: `${SIZE.text['tiny']} ${SIZE.padding['tiny']} ${SIZE_INNER.height['tiny']}`,
  small: `${SIZE.text['small']} ${SIZE.padding['small']} ${SIZE_INNER.height['small']}`,
  medium: `${SIZE.text['medium']} ${SIZE.padding['medium']} ${SIZE_INNER.height['medium']}`,
  large: `${SIZE.text['large']} ${SIZE.padding['large']} ${SIZE_INNER.height['large']}`,
  xlarge: `${SIZE.text['xlarge']} ${SIZE.padding['xlarge']} ${SIZE_INNER.height['xlarge']}`,
}

export const SIZE_VARIANTS_DEFAULT = 'small'

export type PageSize = 'default' | 'small' | 'medium' | 'large' | 'full'

export const PAGE_SIZE_CLASSES = {
  small: 'max-w-3xl px-8',
  medium: 'max-w-5xl px-8',
  large: 'max-w-7xl px-8',
  default: 'max-w-5xl px-8',
  full: 'w-full',
} as const
