"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger = __importStar(require("../utils/logger"));
const v4_1 = __importDefault(require("uuid/v4"));
const nanoid_1 = __importDefault(require("nanoid"));
const emails_1 = require("./emails");
const utils_1 = require("../utils/utils");
const uuid = () => v4_1.default().toUpperCase();
exports.checkout = (services) => async (checkoutData) => {
    logger.info('Processing checkout ' + JSON.stringify(checkoutData));
    const customer = await services.customerRepository.findOrCreate(checkoutData.email);
    const stripePaymentIntent = await services.stripe.findPaymentIntent(checkoutData.paymentIntentId);
    const stripeCustomer = await services.stripe.findOrCreateCustomer(checkoutData.email);
    await services.stripe.testCharge(stripeCustomer.id, stripePaymentIntent);
    const stripeSubscription = checkoutData.product.isSubscription ? await services.stripe.findSubscription(checkoutData.subscriptionId) : null;
    // checkoutData.paymentIntent.payment_method = await services.stripe.findPaymentMethod(checkoutData.paymentIntent.payment_method)
    const accountingData = {
        address: checkoutData.address,
        amount: checkoutData.amount,
        country: checkoutData.country,
        currency: checkoutData.currency,
        isEU: checkoutData.isEU,
        name: checkoutData.name,
        price: checkoutData.price,
        vatAmount: checkoutData.vatAmount,
        vatNumber: checkoutData.vatNumber,
        vatRate: checkoutData.vatRate,
        item: checkoutData.product.name,
    };
    const product = {
        code: checkoutData.product.code,
        permalink: checkoutData.product.permalink,
        isSubscription: checkoutData.product.isSubscription,
        name: checkoutData.product.name,
        isSupport: checkoutData.product.isSupport,
        id: nanoid_1.default(4),
        sales: [],
        accountingData,
        licenseKey: checkoutData.product.isSupport ? null : uuid(),
        stripe: {
            subscription: stripeSubscription,
        },
    };
    const sale = await services.customerRepository.createSale(accountingData, stripePaymentIntent);
    await services.renderInvoice(sale);
    product.sales.push(sale);
    await services.notifyLicensingServer(customer, product, product.sales[0]);
    customer.products = customer.products || [];
    customer.products.push(product);
    await services.customerRepository.update(customer);
    const mail = product.isSupport ? emails_1.Emails.checkout.support : emails_1.Emails.checkout.enterprise;
    await services.sendEmail({
        to: customer.email,
        content: utils_1.interpolate(mail.customer.content, {
            customer,
            product,
            sale: product.sales[0],
        }),
        subject: utils_1.interpolate(mail.customer.subject, {
            customer,
            product,
            sale: product.sales[0],
        }),
    });
    await services.sendEmail({
        to: 'jan.blaha@jsreport.net',
        content: utils_1.interpolate(mail.us.content, { customer, product }),
        subject: utils_1.interpolate(mail.us.subject, { customer, product }),
    });
    return customer;
};
//# sourceMappingURL=checkout.js.map