const bcrypt = require('bcrypt');

// Generate password hash for 'password'
const password = 'password';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
  } else {
    console.log('Password hash for "password":');
    console.log(hash);
  }
});

// Also show the hash we're using in the JSON
console.log('\nCurrent hash in users.json is for password: "password"');
console.log('Hash: $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
