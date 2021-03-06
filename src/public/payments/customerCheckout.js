// SE817603255801
// CZ05821916
/* global countries */
/* eslint no-unused-vars: "off" */

import countries from './countries'
import products from './products'

export async function getUserCountry() {
  const res = await window.fetch('https://geoip-db.com/json/')
  const data = await res.json()
  return data.country_code
}

export async function validateVAT(vatNumber) {
  if (vatNumber == null) {
    return {
      isValid: false,
    }
  }

  try {
    const r = await window.fetch('/api/payments/validate-vat', {
      method: 'POST',
      body: JSON.stringify({ vatNumber }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await r.json()

    if (data.error || data.valid === false) {
      return {
        isValid: false,
      }
    } else {
      return {
        isValid: true,
        value: data,
      }
    }
  } catch (e) {
    return {
      isValid: false,
    }
  }
}

export const productCode = () => window.location.pathname.substring(window.location.pathname.lastIndexOf('/') + 1)
export const product = () => products[productCode()]
export const currency = 'usd'
export const currencyChar = '$'
export const price = () => product().price[currency]

export function calculatePrice({ country, isVATValid }) {
  function round(value) {
    return Number(Math.round(value + 'e' + 2) + 'e-' + 2)
  }

  function getVatRate() {
    if (country === 'CZ') {
      return 21
    }

    return countries.find((c) => c.code === country).eu && !isVATValid ? 21 : 0
  }

  const vatRate = getVatRate()
  const vatAmount = round(vatRate * 0.01 * price())
  return {
    vatRate,
    vatAmount,
    amount: vatAmount + price(),
  }
}
