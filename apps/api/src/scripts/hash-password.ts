import bcrypt from 'bcryptjs';

/** Usage: npm run hash-password -w apps/api -- "<password>"  → prints a value for ADMIN_PASSWORD_HASH */
const password = process.argv[2];
if (!password || password.length < 10) {
  console.error('Provide a password of at least 10 characters.');
  process.exit(1);
}
console.log(bcrypt.hashSync(password, 12));
