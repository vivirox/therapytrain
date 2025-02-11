export const srOnly = 'sr-only'
export const srOnlyFocusable = 'sr-only focus:not-sr-only'

export const announcePageChange = (title: string) => {
  return `Navigated to ${title} page`
}

export const announceLoadingState = (isLoading: boolean) => {
  return isLoading ? 'Loading content' : 'Content loaded'
}

export const announceErrorState = (error: string) => {
  return `Error: ${error}`
}

export const announceSuccessState = (message: string) => {
  return `Success: ${message}`
}

export const announceListNavigation = (index: number, total: number) => {
  return `Item ${index + 1} of ${total}`
}

export const announceModalState = (isOpen: boolean) => {
  return isOpen ? 'Dialog opened' : 'Dialog closed'
}

export const announceExpandedState = (isExpanded: boolean) => {
  return isExpanded ? 'Expanded' : 'Collapsed'
}

export const announceSelectedState = (isSelected: boolean) => {
  return isSelected ? 'Selected' : 'Unselected'
} 