const fs = require('fs');
const path = require('path');

// Your Firebase service account JSON
const firebaseServiceAccount = {
  "type": "service_account",
  "project_id": "bukki-app",
  "private_key_id": "d0f96771bce88bfde710f142f50394c51638738e",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDpZrlZFj5R4zby\nzxtalKriP5bDNxnbCb2NbQbQb+DZIAaE8C6VzRU3fZNcLoiU3YgtOmIxhYpNLpIe\ncGWwbJxgUr9WgsADU2yPo57GEXcSyDH9Q9xqlSXl/t5kVvCxvPow4OFksmQCLJ7k\naV9K8yo7xWEmb9WbZA1eEtBH+TA0aBeL+g9JUA6vQd4Wwl7K5eWOMijWhMTYBP4/\ngo7m0eoKpsaU9JJDCVQwLwLmPbyrq0F0cbed7cP3CNxrPWk89TtffnZVV7KCoqF6\n8TWzGVD83pc9M5E+zMkNDab7SJ3hKl3UC420tz6rIOtNTral9zEv9OW+eIaeHk7Y\nKJtheZ7rAgMBAAECggEAQA2OaTn3AV8TSeB3l8y79tpPpCRfhqKuL/1PRO2nLb8h\nuuL1TewZ2gAu7DnjBsOjJxJiN0f4NAVHWW4sIhY0diTPWM0KJ/+BiAv1u1K4tGFX\ngrNYbrGe1Hc1DiFj7cs4eCiHAq0IUCZxtqqKWdXQ7dVVu4gufXYgSwRrv4zN41t1\niLRnjvYrsWMbutI7wCkVtjgZkRENPtx0I7SgqdrgCmD88aUk9D+JQy5CHp1xWrWg\nP+15UZqqsXZoyunPUplcjFznxl1WINVsyF9Oi98TE8tdKe5vitVOqUzF4r0M4udq\nQrYzCqPH9pxgx0rd5JNJ/FnL4HpjbdD1XSSWOp68KQKBgQD39QWrsIDdfWGBi5LN\nnl5VKEuEOYrQnokxzdyabToXqibIsgP9082fB+TrcAeJIfoDempwHzJcMzImX30d\nFlsm/1s9VbpVF+374jQ2sPbNchhkeRisbFr8LvVJ+Y/NveDAeqlGNcEy/ilJ069j\nCjVtYiHBhJJq9F4rnrWYvUVBuQKBgQDw+NVevsDK51K8ESWNe1gEqzF3J9E0o+1p\nckVPYsL8p43bnfKkbXYWQ31dPoWDCbewxxjcisCq5XbfP3JLImZ6+dOVTNS0oZ5T\np/s0o2o+x+/syf1Ap2sRW8lkZNMsC6B7AjIuF1IvmI0km42sl1Wx2KGZEQ0wHwCM\nsdEweJCHwwKBgQC1dnHR9ng4oDutrNGg/VeYBsdNWzdF+d/5vOjHc0xiaTm9Atp8\n9nay/foAe5poN59a0En5CDu40hbPkm5jzSqkXZkOSCD3iW23OxJvPA9Cx08mqKDv\n/tSPXmZQ3vzo2x8SfjJHmatsgCkDSJJAbwYuqPR/RWBKOdB5J8tKnqmCsQKBgQDp\n5N1WRVjkmXuYyBvnJB3fCjvNKHzL14GNpDjaQUZ57jinPrxSFV1VZtS8OP9mnXwK\nvnXHO3afanLjZrYNb6qBGxTgCd88JNOE57vQ7/0kSvT6pWSH6PjntGvaYnMGgZKX\nUx5Z1pETWcNGESaGq62mHltcM0zVtIHYDpC5t4yx+QKBgQCzLlVuSpLzNnmYvhMD\nlJGvZOmTAJ+rM5Twxx15a8eybWYYr2sZ6VlthTASNSayabqiXYkey84LO6JZtLqq\nw4p42RcZdfrL9sXUim+vtsColrrdixjBrNOJ5YLIj/N+aaOKsKbHy/Z2HPWaeVCM\naLvE7big1cZpHLgDdfEzahUXDg==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@bukki-app.iam.gserviceaccount.com",
  "client_id": "111896140695755542439",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40bukki-app.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

// Read env.example if .env doesn't exist
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
} else if (fs.existsSync(envExamplePath)) {
  envContent = fs.readFileSync(envExamplePath, 'utf8');
}

// Convert JSON to single-line string
const firebaseJsonString = JSON.stringify(firebaseServiceAccount);

// Check if FIREBASE_SERVICE_ACCOUNT already exists
if (envContent.includes('FIREBASE_SERVICE_ACCOUNT=')) {
  // Replace existing
  envContent = envContent.replace(
    /FIREBASE_SERVICE_ACCOUNT=.*/,
    `FIREBASE_SERVICE_ACCOUNT=${firebaseJsonString}`
  );
} else {
  // Add new
  envContent += `\n# Push Notifications (Firebase Cloud Messaging)\nFIREBASE_SERVICE_ACCOUNT=${firebaseJsonString}\n`;
}

// Write to .env file
fs.writeFileSync(envPath, envContent, 'utf8');

console.log('✅ Firebase service account added to backend/.env');
console.log('📝 File location:', envPath);
console.log('\n⚠️  Make sure to update other values in .env (database, JWT secret, etc.)');

