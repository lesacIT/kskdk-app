const bcrypt = require('bcryptjs');
const password = '123456';
const hash = bcrypt.hashSync(password, 8);
console.log(hash);