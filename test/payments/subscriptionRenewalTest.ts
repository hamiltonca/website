import databaseTest from './databaseTest'
import { CustomerRepository, Sale } from '../../src/lib/payments/customer'
import should from 'should'
import { Db } from 'mongodb'
import { createProduct } from './helpers'
import moment from 'moment'
import SubscriptionRenewal from '../../src/lib/payments/subscriptionRenewal'
import { Email } from '../../src/lib/utils/mailer'

databaseTest((getDb) => {
  describe('subsciption renewal', () => {
    let db: Db
    let customerRepository: CustomerRepository
    let subscriptionRenewal: SubscriptionRenewal
    let stripe: any
    let emails: Array<Email> = []
    let licensingServerNotifications = []

    beforeEach(() => {
      licensingServerNotifications = []
      emails = []
      db = getDb()
      customerRepository = new CustomerRepository(db)
      stripe = {}
      subscriptionRenewal = new SubscriptionRenewal({
        customerRepository,
        stripe,
        sendEmail: async (m) => emails.push(m),
        renderInvoice: async (s: Sale) => {},
        notifyLicensingServer: async (customer, product, sale) => {
          licensingServerNotifications.push({
            customer,
            product,
            sale,
          })
        },
      })
    })

    it('should renew if payment successfull', async () => {
      let customer = await customerRepository.findOrCreate('a@a.com')
      const product = createProduct()
      const originalNextPayment = (product.subscription.nextPayment = moment().add('-1', 'days').toDate())
      customer.products = [product]
      await customerRepository.update(customer)

      stripe.findOrCreateCustomer = () => ({
        id: 'customerId',
      })

      stripe.createConfirmedPaymentIntent = (id, paymentMethodId, amount) => {
        id.should.be.eql('customerId')
        paymentMethodId.should.be.eql(product.subscription.stripe.paymentMethodId)
        amount.should.be.eql(product.sales[0].accountingData.amount)

        return {
          id: 'paymentIntentId',
        }
      }

      await subscriptionRenewal.process()
      customer = await customerRepository.findOrCreate('a@a.com')

      customer.products[0].sales.should.have.length(2)
      customer.products[0].subscription.state.should.be.eql('active')
      should(customer.products[0].subscription.retryPlannedPayment).be.null()
      should(customer.products[0].subscription.plannedCancelation).not.be.ok()

      moment(customer.products[0].subscription.nextPayment)
        .startOf('day')
        .toDate()
        .should.be.eql(moment(originalNextPayment).add(1, 'years').startOf('day').toDate())

      emails[0].to.should.be.eql(customer.email)
      emails[0].content.should.containEql('renewed')

      customer.products[0].sales[1].accountingData.amount.should.be.eql(customer.products[0].sales[0].accountingData.amount)

      licensingServerNotifications[0].customer.email.should.be.eql(customer.email)
    })

    it('should mark to retry payment when the first ', async () => {
      let customer = await customerRepository.findOrCreate('a@a.com')
      const product = createProduct()
      product.subscription.nextPayment = moment().add('-1', 'days').toDate()
      customer.products = [product]
      await customerRepository.update(customer)

      stripe.findOrCreateCustomer = () => ({
        id: 'customerId',
      })

      stripe.createConfirmedPaymentIntent = (id, paymentMethodId, amount) => {
        throw new Error('failed')
      }

      await subscriptionRenewal.process()
      customer = await customerRepository.findOrCreate('a@a.com')
      customer.products[0].sales.should.have.length(1)

      moment(customer.products[0].subscription.retryPlannedPayment).startOf('day').toDate().should.be.eql(moment().add(1, 'days').startOf('day').toDate())
    })

    it('should mark to cancelation payment when the second payment fails', async () => {
      let customer = await customerRepository.findOrCreate('a@a.com')
      const product = createProduct()
      const originalNexyPayment = (product.subscription.nextPayment = moment().add('-2', 'days').toDate())
      product.subscription.retryPlannedPayment = moment().add('-1', 'days').toDate()
      customer.products = [product]
      await customerRepository.update(customer)

      stripe.findOrCreateCustomer = () => ({
        id: 'customerId',
      })

      stripe.createConfirmedPaymentIntent = (id, paymentMethodId, amount) => {
        throw new Error('failed')
      }

      await subscriptionRenewal.process()
      customer = await customerRepository.findOrCreate('a@a.com')
      customer.products[0].sales.should.have.length(1)

      should(customer.products[0].subscription.retryPlannedPayment).be.null()
      moment(customer.products[0].subscription.plannedCancelation)
        .startOf('day')
        .toDate()
        .should.be.eql(moment(originalNexyPayment).add(1, 'month').startOf('day').toDate())

      emails[0].to.should.be.eql(customer.email)
      emails[0].content.should.containEql('bank credentials')
    })

    it('should cancel subscription after month', async () => {
      let customer = await customerRepository.findOrCreate('a@a.com')
      const product = createProduct()
      product.subscription.nextPayment = moment().add('-2', 'days').toDate()
      product.subscription.plannedCancelation = moment().add('-1', 'days').toDate()
      customer.products = [product]
      await customerRepository.update(customer)

      stripe.findOrCreateCustomer = () => ({
        id: 'customerId',
      })

      await subscriptionRenewal.process()
      customer = await customerRepository.findOrCreate('a@a.com')
      customer.products[0].subscription.state.should.be.eql('canceled')
    })
  })
})
