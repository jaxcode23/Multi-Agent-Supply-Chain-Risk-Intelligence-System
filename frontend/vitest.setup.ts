import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock IntersectionObserver for tests
class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
})

// Mock Element.prototype.animate for tests
Element.prototype.animate = vi.fn().mockReturnValue({
  onfinish: null,
  remove: vi.fn(),
}) as any
