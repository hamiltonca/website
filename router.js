﻿const path = require('path')

module.exports = (payments, db) => ({
  onprem (req, res) {
    return res.render('onprem', {
      onprem: true,
      title: 'jsreport - report server',
      description: 'Download jsreport on-prem version to your server in your company and use it without any limitations.'
    })
  },

  playground (req, res) {
    return res.render('playground', {
      playground: true,
      title: 'Try free jsreport online playground',
      description: 'Try free jsreport online fiddling tool. Share your reports with others. Embed report generation into your website.'
    })
  },

  buyOnPrem (req, res) {
    return res.render('buy', {
      buy: true,
      buyOnPrem: true,
      title: 'jsreport - buy',
      description: 'Buy jsreport license'
    })
  },

  buySupport (req, res) {
    return res.render('buy', {
      buy: true,
      buySupport: true,
      title: 'jsreport - buy',
      description: 'Buy jsreport support'
    })
  },

  buyOnline (req, res) {
    return res.render('buy', {
      buy: true,
      buyOnline: true,
      title: 'jsreport - buy',
      description: 'Buy jsreport online credits'
    })
  },

  buyThankYou (req, res) {
    return res.render('thank-you', {
      buy: true,
      title: 'jsreport - buy',
      description: 'Thank you'
    })
  },

  online (req, res) {
    return res.render('online', {
      online: true,
      title: 'jsreportonline - pdf reports as a service',
      description: 'Do not install anything. Just register to cloud based jsreportonline service and start creating reports now.'
    })
  },

  onlinePricing (req, res) {
    return res.render('online-pricing', {
      online: true,
      title: 'jsreportonline - pdf reports as a service',
      description: 'Do not install anything. Just register to cloud based jsreportonline service and start creating reports now.'
    })
  },

  about (req, res) {
    return res.render('about', { about: true, title: 'About jsreport' })
  },

  downloads (req, res) {
    return res.redirect('/on-prem')
  },

  embedding (req, res) {
    return res.render('embedding', {
      playground: true,
      title: 'Embed jsreport to any page'
    })
  },

  showcases (req, res) {
    return res.render('showcases', {
      title: 'jsreport - showcases',
      description: 'jsreport showcases'
    })
  },

  contactEmail (req, res) {
    return db
      .collection('contacts')
      .insertOne({
        date: new Date(),
        email: req.body.contactEmail,
        enabledNewsletter: req.body.enabledNewsletter === 'true',
        type: req.body.type
      })
      .then(() => {
        // expire in 30seconds
        res.cookie('jsreport-contact-email-set', 'true', {
          maxAge: 30 * 60 * 1000
        })
        res.send('ok')
      })
      .catch(e => {
        console.error(e)
        res.send('error ' + e)
      })
  },

  payments (req, res) {
    return res.render(path.join(__dirname, '/dist/app.html'), {
      title: 'jsreport customers'
    })
  },

  checkoutSubmit (req, res, next) {
    return payments
      .checkout(req.body)
      .then(r => res.send(r))
      .catch(next)
  },

  braintreeToken (req, res, next) {
    return payments
      .generateToken()
      .then(r => res.send(r))
      .catch(next)
  },

  validateVat (req, res) {
    return payments
      .validateVat(req.body.vatNumber)
      .then(r => res.send(r))
      .catch(r => res.send({ valid: false }))
  },

  customerApi (req, res, next) {
    return payments
      .customer(req.params.id)
      .then(r => res.send(r))
      .catch(next)
  },

  invoice (req, res, next) {
    return payments
      .invoice(req.params.customerId, req.params.invoiceId)
      .then(buf => {
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `inline; filename=${req.params.invoiceId}.pdf`)
        res.send(buf)
      })
      .catch(next)
  },

  cancelSubscription (req, res, next) {
    return payments
      .cancelSubscription(req.params.customerId, req.params.productId)
      .then(() => res.send({ result: 'ok' }))
      .catch(next)
  },

  updatePaymentMethod (req, res, next) {
    return payments
      .updatePaymentMethod(req.params.customerId, req.params.productId, req.body)
      .then(() => res.send({ result: 'ok' }))
      .catch(next)
  },

  braintreeHook (req, res, next) {
    return payments
      .braintreeHook(req.body.bt_signature, req.body.bt_payload)
      .then(() => res.send('ok'))
      .catch(next)
  }
})
