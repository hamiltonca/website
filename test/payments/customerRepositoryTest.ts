import databaseTest from './databaseTest'
import { CustomerRepository } from '../../src/lib/payments/customer'
import 'should'
import { Db } from 'mongodb'
import { createProduct } from './helpers'
import moment from 'moment'

databaseTest((getDb) => {
  describe('customer repository', () => {
    let db: Db
    let customerRepository: CustomerRepository

    beforeEach(() => {
      db = getDb()
      customerRepository = new CustomerRepository(db)
    })

    it('findSale', async () => {
      const customer = await customerRepository.findOrCreate('a@a.com')
      const product = createProduct()
      customer.products = [product]
      await customerRepository.update(customer)
      const sale = await customerRepository.findSale(customer.uuid, product.sales[0].id)
      sale.should.be.ok()
    })

    it('create sale', async () => {
      const sale = await customerRepository.createSale(createProduct().accountingData, { paymentIntentId: 'paymentintentid' })
      sale.id.should.be.eql(`${new Date().getFullYear()}-1B`)
      sale.stripe.paymentIntentId.should.be.eql('paymentintentid')

      const sale2 = await customerRepository.createSale(createProduct().accountingData, { paymentIntentId: 'paymentintentid2' })
      sale2.id.should.be.eql(`${new Date().getFullYear()}-2B`)

      const count = await db.collection('invoiceCounter').countDocuments({})
      count.should.be.eql(1)
    })

    it('findCustomersWithPastDueSubscriptions should filter out subscriptions in the future and canceled', async () => {
      const canceled = await customerRepository.findOrCreate('canceled')
      const canceledProduct = createProduct()
      canceledProduct.subscription.state = 'canceled'
      canceled.products = [canceledProduct]
      await customerRepository.update(canceled)

      const future = await customerRepository.findOrCreate('future')
      const futureProduct = createProduct()
      futureProduct.subscription.nextPayment = moment().add(1, 'days').toDate()
      future.products = [futureProduct]
      await customerRepository.update(future)

      const ok = await customerRepository.findOrCreate('ok')
      const okProduct = createProduct()
      okProduct.subscription.nextPayment = moment().add(-1, 'days').toDate()
      ok.products = [okProduct]
      await customerRepository.update(ok)

      const customers = await customerRepository.findCustomersWithPastDueSubscriptions()
      customers.should.have.length(1)
      customers[0].email.should.be.eql('ok')
    })
  })
})
