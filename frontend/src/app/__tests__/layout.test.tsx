import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RootLayout from '../layout'

describe('RootLayout', () => {
  it('renders children', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(
      RootLayout({ children: <div>test child</div> })
    )
    expect(container.textContent).toContain('test child')
    err.mockRestore()
  })
})
