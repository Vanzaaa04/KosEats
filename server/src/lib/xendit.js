/**
 * Xendit API Utility — KosEats Split Payment
 * Menggunakan fetch native (tanpa library tambahan) untuk berkomunikasi dengan Xendit API.
 * 
 * Fitur:
 * - createSubAccount: Membuat Sub-Akun Xendit untuk penjual baru
 * - createInvoice: Membuat tagihan (Invoice) dengan split payment
 * - getInvoice: Mengecek status tagihan
 */

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;
const XENDIT_BASE_URL = 'https://api.xendit.co';

// Helper: Generate Basic Auth header dari Secret Key
function getAuthHeader() {
  const encoded = Buffer.from(`${XENDIT_SECRET_KEY}:`).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * Membuat Sub-Akun Xendit (xenPlatform) untuk penjual baru.
 * Dipanggil saat Admin meng-approve toko penjual.
 * 
 * @param {string} email - Email penjual
 * @param {string} businessName - Nama toko penjual
 * @returns {Object} - { id, email, status, ... }
 */
async function createSubAccount(email, businessName) {
  const response = await fetch(`${XENDIT_BASE_URL}/v2/accounts`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: email,
      type: 'MANAGED',
      public_profile: {
        business_name: businessName
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Xendit createSubAccount error:', data);
    throw new Error(data.message || 'Gagal membuat Sub-Akun Xendit');
  }

  console.log(`✅ Sub-Akun Xendit berhasil dibuat untuk "${businessName}": ${data.id}`);
  return data;
}

/**
 * Membuat Invoice (Tagihan) dengan Split Payment.
 * Saat pembeli checkout, uang otomatis dipecah antara penjual & platform.
 * 
 * @param {Object} params
 * @param {string} params.externalId - ID unik pesanan (misal "KE-1719412345-abc")
 * @param {number} params.amount - Total tagihan pembeli (termasuk biaya layanan)
 * @param {number} params.platformFee - Komisi platform + biaya layanan (masuk ke akun utama)
 * @param {string} params.subAccountId - ID Sub-Akun Xendit penjual
 * @param {string} params.description - Deskripsi tagihan
 * @param {Object} params.customer - Data pembeli { name, email, phone }
 * @param {Array}  params.items - Daftar item pesanan
 * @returns {Object} - { id, invoice_url, status, ... }
 */
async function createInvoice({ externalId, amount, platformFee, subAccountId, description, customer, items }) {
  const payload = {
    external_id: externalId,
    amount: amount,
    description: description || `Pesanan KosEats #${externalId}`,
    currency: 'IDR',
    payment_methods: ['QRIS', 'EWALLET'],
    success_redirect_url: process.env.XENDIT_SUCCESS_REDIRECT_URL || 'http://localhost:3000/orders?payment=success',
    failure_redirect_url: process.env.XENDIT_FAILURE_REDIRECT_URL || 'http://localhost:3000/orders?payment=failed',
    customer: {
      given_names: customer?.name || 'Pembeli KosEats',
      email: customer?.email || '',
      mobile_number: customer?.phone || ''
    },
    items: items || []
  };

  if (platformFee && subAccountId) {
    payload.fees = [
      {
        type: 'PLATFORM',
        value: platformFee
      }
    ];
  }

  const headers = {
    'Authorization': getAuthHeader(),
    'Content-Type': 'application/json'
  };

  if (subAccountId) {
    headers['for-user-id'] = subAccountId;
  }

  const response = await fetch(`${XENDIT_BASE_URL}/v2/invoices`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Xendit createInvoice error:', data);
    throw new Error(data.message || 'Gagal membuat tagihan Xendit');
  }

  console.log(`✅ Invoice Xendit berhasil dibuat: ${data.id} | URL: ${data.invoice_url}`);
  return data;
}

/**
 * Mengecek status Invoice.
 * Berguna untuk verifikasi manual atau polling.
 * 
 * @param {string} invoiceId - ID Invoice Xendit
 * @returns {Object} - { id, status, paid_at, ... }
 */
async function getInvoice(invoiceId) {
  const response = await fetch(`${XENDIT_BASE_URL}/v2/invoices/${invoiceId}`, {
    method: 'GET',
    headers: {
      'Authorization': getAuthHeader()
    }
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Xendit getInvoice error:', data);
    throw new Error(data.message || 'Gagal mengecek status invoice');
  }

  return data;
}

module.exports = {
  createSubAccount,
  createInvoice,
  getInvoice
};
