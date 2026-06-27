const { Client } = require('pg');

const passwords = ['postgres', 'root', '123456', 'admin', 'password', ''];

async function testPasswords() {
  for (const pw of passwords) {
    const client = new Client({
      user: 'postgres',
      host: 'localhost',
      database: 'postgres',
      password: pw,
      port: 5432,
    });
    try {
      await client.connect();
      console.log(`SUCCESS: password is '${pw}'`);
      await client.end();
      return;
    } catch (err) {
      console.log(`Failed with '${pw}'`);
    }
  }
  console.log('All common passwords failed.');
}

testPasswords();
