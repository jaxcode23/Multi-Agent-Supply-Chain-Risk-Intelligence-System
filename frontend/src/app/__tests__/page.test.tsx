import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LandingPage from '../page'

describe('LandingPage', () => {
  it('renders the system title', () => {
    render(<LandingPage />)
    expect(screen.getByText('RISK_INTEL_SYSTEM_V1.0')).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(<LandingPage />)
    expect(screen.getByText('Intelligence')).toBeInTheDocument()
    expect(screen.getByText('Ecosystem')).toBeInTheDocument()
    expect(screen.getByText('Architecture')).toBeInTheDocument()
    expect(screen.getByText('DevDocs')).toBeInTheDocument()
  })

  it('renders the Launch Console button', () => {
    render(<LandingPage />)
    expect(screen.getByText('Launch Console')).toBeInTheDocument()
  })

  it('renders the main heading', () => {
    render(<LandingPage />)
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings[0].textContent).toMatch(/Operational Intelligence/)
  })

  it('renders pipeline section with all five technology cards', () => {
    render(<LandingPage />)
    expect(screen.getByText('Go')).toBeInTheDocument()
    expect(screen.getByText('Scala')).toBeInTheDocument()
    expect(screen.getByText('Python')).toBeInTheDocument()
    expect(screen.getByText('Rust')).toBeInTheDocument()
    expect(screen.getByText('Next.js')).toBeInTheDocument()
  })

  it('renders the Initialize Node button', () => {
    render(<LandingPage />)
    expect(screen.getByText('Initialize Node')).toBeInTheDocument()
  })

  it('renders the View Documentation button', () => {
    render(<LandingPage />)
    expect(screen.getByText('View Documentation')).toBeInTheDocument()
  })

  it('renders agent cards', () => {
    render(<LandingPage />)
    expect(screen.getByText('NEWS_INTEL_A')).toBeInTheDocument()
    expect(screen.getByText('LOGISTICS_STRAT')).toBeInTheDocument()
    expect(screen.getByText('SUPPLIER_RISK')).toBeInTheDocument()
    expect(screen.getByText('MITIGATION_EXE')).toBeInTheDocument()
  })

  it('renders Current Threat Level', () => {
    render(<LandingPage />)
    expect(screen.getByText('Current Threat Level')).toBeInTheDocument()
  })
})
