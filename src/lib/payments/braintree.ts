import * as braintree from 'braintree'

export default class Braintree {
  _gateway: braintree.BraintreeGateway

  constructor() {
    this._gateway = new braintree.BraintreeGateway({
      environment: braintree.Environment.Sandbox,
      merchantId: process.env.BRAINTREE_MERCHANT_ID,
      publicKey: process.env.BRAINTREE_PUBLIC_KEY,
      privateKey: process.env.BRAINTREE_PRIVATE_KEY
    })
  }

  generateToken() {
    return this._gateway.clientToken.generate({}).then(r => r.clientToken)
  }

  createCustomer(obj) {
    return this._gateway.customer.create(obj)
  }

  createPaymentMethod(obj) {
    return this._gateway.paymentMethod.create(obj)
  }

  createSubscription(obj) {
    return this._gateway.subscription.create(obj)
  }

  createSale(obj) {
    return this._gateway.transaction.sale(obj)
  }

  updateSubscription(id, obj) {
    return this._gateway.subscription.update(id, obj)
  }

  cancelSubscription(obj) {
    return this._gateway.subscription.cancel(obj)
  }

  parseWebHook(signature, obj) {
    return (<any>this._gateway).webhookNotification.parse(signature, obj)
  }
}

