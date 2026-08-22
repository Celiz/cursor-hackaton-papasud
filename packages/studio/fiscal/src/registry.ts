import type { CountryCode, FiscalProvider } from './types'

type FiscalProviderFactory = () => FiscalProvider

const providers = new Map<CountryCode, FiscalProviderFactory>()

export function registerFiscalProvider(
  country: CountryCode,
  factory: FiscalProviderFactory,
): void {
  providers.set(country, factory)
}

export function getFiscalProvider(country: CountryCode): FiscalProvider {
  const factory = providers.get(country)
  if (!factory) {
    throw new Error(
      `Fiscal provider for country "${country}" is not registered. ` +
      `Supported: ${getSupportedCountries().join(', ')}`,
    )
  }
  return factory()
}

export function getSupportedCountries(): CountryCode[] {
  return Array.from(providers.keys())
}
