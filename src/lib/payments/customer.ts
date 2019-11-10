import { Db } from 'mongodb'
import nanoid from 'nanoid'

export type AccountingData = {
    name: string,
    address: string,
    country: string,
    vatNumber: string,
    isEU: boolean,
    vatRate: number,
    currency: string,
    price: number,
    amount: number,
    vatAmount: number,
    item: string
}

export type Sale = {
    purchaseDate: Date
    accountingData: AccountingData,
    id: string,
    blobName: string
}

export type Subscription = {
    nextBillingDate: Date,
    state: 'active' | 'canceled'
}

export type Product = {
    id: string
    licenseKey?: string
    isSubscription: boolean
    isSupport: boolean
    code: string
    permalink: string
    name: string
    sales: Array<Sale>
    braintree: any
    subscription?: Subscription
    accountingData: AccountingData
}

export type Customer = {
    _id: string
    email: string
    uuid: string
    creationDate: Date
    products: Array<Product>,
    braintree: any
}

export class CustomerRepository {
    db: Db

    constructor(db: Db) {
        this.db = db
    }

    async find(customerId) {
        const customer = await this.db.collection('customers').findOne({ uuid: customerId })
        if (!customer) {
            throw new Error('Customer not found')
        }

        return <Customer>customer
    }

    async findOrCreate(email) {
        let customer = await this.db.collection('customers').findOne({ email })

        if (customer) {
            return <Customer>customer
        }

        customer = {
            email,
            uuid: nanoid(16),
            creationDate: new Date()
        }

        await this.db.collection('customers').insertOne(customer)

        return <Customer>customer
    }

    async update(customer: Customer) {
        return this.db.collection('customers').updateOne({ _id: customer._id }, { $set: { ...customer } })
    }

    async findSale(customerId, saleId): Promise<Sale> {
        const customer = await this.find(customerId)

        const sale = Array.prototype.concat(...customer.products.map(p => p.sales)).find(s => s.id === saleId)

        if (!sale) {
            throw new Error(`Invoice ${saleId} not found`)
        }

        return sale
    }

    async findBySubscription(subscriptionId) {
        const customer = await this.db.collection('customers').findOne({ products: { $elemMatch: { 'braintree.subscription.id': subscriptionId } } })
        return <Customer>customer
    }

    async createSale(data: AccountingData) {
        await this.db.collection('invoiceCounter').updateOne(
            {},
            {
                $inc: {
                    nextId: 1
                }
            }
        )
        let counter = await this.db.collection('invoiceCounter').findOne({})
        if (counter == null) {
            counter = { nextId: 1 }
        }

        const id = `${new Date().getFullYear()}-${counter.nextId}B`
        const sale: Sale = {
            accountingData: data,
            id: id,
            blobName: `${id}.pdf`,
            purchaseDate: new Date()
        }

        return sale
    }
}

