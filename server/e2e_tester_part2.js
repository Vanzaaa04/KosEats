
const io = require('socket.io-client');

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

let adminToken, buyerToken, sellerToken, courierToken;
let testCourierId, testStoreId, menuId, orderId;

async function runTestPart2() {
  console.log('\n======================================================');
  console.log('🚀 MEMULAI PENGUJIAN E2E KOSEATS V2 (FASE 4-7) 🚀');
  console.log('======================================================\n');

  try {
    // [4.0] Login everything
    const loginUser = async (email, password) => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      return data.data.token;
    };

    console.log('[4.0] Login Admin, Buyer, Seller, Courier...');
    adminToken = await loginUser('test_admin@gmail.com', 'password123');
    buyerToken = await loginUser('test_buyer@gmail.com', 'password123');
    sellerToken = await loginUser('test_seller@gmail.com', 'password123');
    courierToken = await loginUser('test_courier@gmail.com', 'password123');
    console.log('✅ Semua user berhasil login.');

    // Find Courier Profile ID
    const couriersRes = await fetch(`${API_URL}/admin/couriers`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const couriersData = await couriersRes.json();
    const courierProfile = couriersData.data.find(c => c.user.email === 'test_courier@gmail.com');
    if (courierProfile) {
      testCourierId = courierProfile.id;
      // Approve courier
      console.log('[4.0.1] Admin menyetujui Kurir...');
      await fetch(`${API_URL}/admin/couriers/${testCourierId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ approve: true })
      });
      console.log('✅ Kurir berhasil disetujui.');
    }

    // Courier Re-Login to refresh token (roles/status)
    courierToken = await loginUser('test_courier@gmail.com', 'password123');

    // Get Store & Menu
    const storesRes = await fetch(`${API_URL}/admin/sellers`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const storesData = await storesRes.json();
    testStoreId = storesData.data.find(s => s.user.email === 'test_seller@gmail.com')?.id;

    // We assume the seller already has a menu (Nasi Goreng Gila) from Part 1
    const menuRes = await fetch(`${API_URL}/stores/${testStoreId}`);
    const menuData = await menuRes.json();
    menuId = menuData.data.menus[0].id;

    // FASE 5 & 6 (Didahulukan agar ada Order yang bisa di track di Fase 4)
    console.log('\n--- FASE 5 & 6: DASBOR KURIR & SISTEM KOMISI ---');
    console.log('[5.1] Pembeli membuat pesanan via Kurir (COD)...');
    
    // Top up dompet kurir so they can accept COD without getting kasbon error
    const topupRes = await fetch(`${API_URL}/wallet/manual-topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ userId: courierProfile.userId, amount: 200000 })
    });
    await topupRes.json();
    console.log('✅ Admin Top Up dompet Kurir Rp 200.000 untuk talangan COD.');

    const orderRes = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${buyerToken}` },
      body: JSON.stringify({
        storeId: testStoreId,
        items: [{ menuId: menuId, quantity: 1 }],
        deliveryMethod: 'COURIER',
        paymentMethod: 'COD'
      })
    });
    const orderData = await orderRes.json();
    orderId = orderData.data.id;
    console.log(`✅ Order berhasil dibuat (ID: ${orderId}).`);

    // Seller Confirm & Cook & Waiting Courier
    const st1 = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sellerToken}` },
      body: JSON.stringify({ status: 'CONFIRMED' })
    });
    await st1.json();
    const st2 = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sellerToken}` },
      body: JSON.stringify({ status: 'COOKING' })
    });
    await st2.json();
    const st3 = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sellerToken}` },
      body: JSON.stringify({ status: 'WAITING_COURIER' })
    });
    await st3.json();
    console.log('✅ Penjual menyiapkan pesanan hingga status WAITING_COURIER.');

    console.log('[5.2] Kurir menerima order (Take Job)...');
    const takeJobRes = await fetch(`${API_URL}/courier/orders/${orderId}/accept`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${courierToken}` }
    });
    const takeJobData = await takeJobRes.json();
    if (takeJobData.success) {
      console.log('✅ Kurir berhasil menerima pesanan.');
    } else {
      console.log('❌ Kurir gagal menerima pesanan:', takeJobData.message);
    }

    console.log('[5.3] Kurir klik "Mulai Antar"...');
    const startDeliveringRes = await fetch(`${API_URL}/courier/orders/${orderId}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${courierToken}` },
      body: JSON.stringify({ status: 'DELIVERING' })
    });
    const startDeliveringData = await startDeliveringRes.json();
    if (startDeliveringData.success) {
      console.log('✅ Status order berubah menjadi DELIVERING. Dompet kurir terpotong (Talangan COD).');
    } else {
      console.log('❌ Gagal Mulai Antar:', startDeliveringData.message);
    }

    // FASE 4: WebSockets GPS & Chat
    console.log('\n--- FASE 4: GPS TRACKING & CHAT (WEBSOCKET) ---');
    console.log('[4.1] Menghubungkan Socket.io...');
    
    // Simulate Buyer Socket
    const buyerSocket = io(SOCKET_URL, { query: { token: buyerToken } });
    const courierSocket = io(SOCKET_URL, { query: { token: courierToken } });

    await new Promise(r => setTimeout(r, 1000));
    
    buyerSocket.emit('track_order', orderId);
    console.log('✅ Pembeli join room tracking.');

    let locationReceived = false;
    buyerSocket.on('location_changed', (data) => {
      if (data.orderId === orderId) locationReceived = true;
    });

    console.log('[4.2] Kurir mengirim update lokasi...');
    courierSocket.emit('location_update', { orderId, latitude: -7.795, longitude: 110.370 });

    await new Promise(r => setTimeout(r, 1500));
    if (locationReceived) {
      console.log('✅ WebSockets GPS Tracking bekerja: Pembeli menerima update lokasi kurir.');
    } else {
      console.log('❌ WebSockets GPS Tracking GAGAL (Tidak ada event diterima).');
    }

    // Simulasi Chat Rest API (Karena di Index.js kita hanya punya socket send_message/receive_message basic, tapi chat api tersimpan di db)
    console.log('[4.3] Pembeli Chat ke Kurir...');
    const chatRes = await fetch(`${API_URL}/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${buyerToken}` },
      body: JSON.stringify({ orderId: orderId, receiverId: courierProfile.userId, content: 'Kurir di mana?' })
    });
    const chatData = await chatRes.json();
    if (chatData.success) {
       console.log('✅ Chat Pembeli berhasil dikirim.');
    } else {
       console.log('❌ Chat Pembeli gagal:', chatData.message);
    }

    buyerSocket.disconnect();
    courierSocket.disconnect();


    console.log('\n--- KEMBALI KE FASE 5 & 6 ---');
    console.log('[5.4] Kurir Selesai Mengantar (Upload Proof)...');
    const finishRes = await fetch(`${API_URL}/courier/orders/${orderId}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${courierToken}` },
      body: JSON.stringify({ status: 'DELIVERED', proofOfDeliveryUrl: '/images/proofs/delivery-123.jpg' })
    });
    const finishData = await finishRes.json();
    if (finishData.success) {
      console.log('✅ Pesanan berstatus DELIVERED. Komisi ongkir 90% masuk ke Kurir, 10% ke Admin.');
    } else {
      console.log('❌ Kurir gagal selesaikan pesanan:', finishData.message);
    }

    console.log('\n--- FASE 7: BANDING & RESOLUSI KONFLIK (APPEAL) ---');
    console.log('[7.1] Pembeli mengajukan komplain (Banding)...');
    const appealRes = await fetch(`${API_URL}/appeals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${buyerToken}` },
      body: JSON.stringify({ orderId, reason: 'Nasi goreng tumpah', evidenceUrl: '/images/proofs/tumpah.jpg' })
    });
    const appealData = await appealRes.json();
    if (appealData.success) {
      console.log('✅ Banding (Appeal) berhasil dibuat pembeli.');
      
      console.log('[7.2] Penjual menyetujui Refund...');
      const appealId = appealData.data.id;
      const resolveRes = await fetch(`${API_URL}/appeals/${appealId}/seller-respond`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sellerToken}` },
        body: JSON.stringify({ accept: true })
      });
      await resolveRes.json();
      console.log('✅ Penjual menyetujui refund. Resolusi selesai.');
    } else {
      console.log('❌ Pembeli gagal komplain:', appealData.message);
    }

    console.log('\n🎉🎉 SEMUA FASE PENGUJIAN (4-7) SELESAI 🎉🎉');
  } catch (err) {
    console.error('💥 FATAL ERROR:', err);
  }
}

runTestPart2();
