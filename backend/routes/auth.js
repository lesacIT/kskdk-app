// Add at the end of the file (before module.exports)
router.post('/register', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').notEmpty().withMessage('Full name is required')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const db = getDb();
    const { username, password, fullName, role = 'doctor' } = req.body;

    // Check if username already exists
    const existing = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.run(`
      INSERT INTO users (username, password, full_name, role)
      VALUES (?, ?, ?, ?)
    `, [username, hashedPassword, fullName, role]);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    next(error);
  }
});