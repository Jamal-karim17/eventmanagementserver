const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
//const dotenv = require('dotenv');

//dotenv.config(); // Load environment variables from .env file

const app = express();
app.use(cors());
app.use(express.json());

// Use environment variable for JWT_SECRET if available
const SECRET_KEY = process.env.JWT_SECRET || 'your_jwt_secret_key';

// MySQL DB Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '7985',
  database: 'event_mgmt_db'
});

db.connect(err => {
  if (err) {
    console.error('❌ Failed to connect to MySQL:', err);
    process.exit(1); // Stop the server if DB connection fails
  }
  console.log('✅ Connected to MySQL');
});

// JWT Middleware
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(403).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(403).json({ message: 'Malformed token' });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Unauthorized' });
    req.userId = decoded.id; // Save user ID in request object
    next();
  });
}

/* ------------------- SIGNUP ------------------- */
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    // Check if user already exists
    const [results] = await db.promise().query('SELECT * FROM users WHERE username = ?', [username]);

    if (results.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 8);

    // Insert new user
    const [result] = await db.promise().query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/* ------------------- LOGIN ------------------- */
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [results] = await db.promise().query('SELECT * FROM users WHERE username = ?', [username]);

    if (results.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = results[0];
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid password' });

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ message: 'Login successful', token });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/* ------------------- EVENTS ------------------- */
// ✅ PUBLIC: Fetch all events
app.get('/api/events', (req, res) => {
  db.query('SELECT * FROM events', (err, results) => {
    if (err) return res.status(500).send({ message: 'Database error', error: err.message });
    res.json(results);
  });
});

// ✅ PUBLIC: Fetch event by ID
app.get('/api/events/:id', (req, res) => {
  db.query('SELECT * FROM events WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).send({ message: 'Database error', error: err.message });
    res.json(results[0]);
  });
});


app.post('/api/events', verifyToken, (req, res) => {
  const { name, location, date, capacity } = req.body;
  db.query('INSERT INTO events (name, location, date, capacity) VALUES (?, ?, ?, ?)',
    [name, location, date, capacity],
    (err, results) => {
      if (err) return res.status(500).send({ message: 'Database error', error: err.message });
      res.json({ message: 'Event created', id: results.insertId });
    });
});

app.put('/api/events/:id', verifyToken, (req, res) => {
  const { name, location, date, capacity } = req.body;
  db.query(
    'UPDATE events SET name=?, location=?, date=?, capacity=? WHERE id=?',
    [name, location, date, capacity, req.params.id],
    (err) => {
      if (err) return res.status(500).send({ message: 'Database error', error: err.message });
      res.json({ message: 'Event updated' });
    });
});

app.delete('/api/events/:id', verifyToken, (req, res) => {
  db.query('DELETE FROM events WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).send({ message: 'Database error', error: err.message });
    res.json({ message: 'Event deleted' });
  });
});

/* ------------------- ATTENDEES ------------------- */
app.get('/api/attendees', verifyToken, (req, res) => {
  db.query('SELECT * FROM attendees', (err, results) => {
    if (err) return res.status(500).send({ message: 'Database error', error: err.message });
    res.json(results);
  });
});

app.get('/api/attendees/:id', verifyToken, (req, res) => {
  db.query('SELECT * FROM attendees WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).send({ message: 'Database error', error: err.message });
    res.json(results[0]);
  });
});

app.post('/api/attendees', (req, res) => {
  const { name, email, phone, id_card, event_id } = req.body;
  db.query(
    'INSERT INTO attendees (name, email, phone, id_card, event_id) VALUES (?, ?, ?, ?, ?)',
    [name, email, phone, id_card, event_id],
    (err, results) => {
      if (err) return res.status(500).send({ message: 'Database error', error: err.message });
      res.json({ message: 'Attendee added', id: results.insertId });
    }
  );
});


app.put('/api/attendees/:id', verifyToken, (req, res) => {
  const { name, email, phone, id_card, event_id } = req.body;
  db.query(
    'UPDATE attendees SET name=?, email=?, phone=?, id_card=?, event_id=? WHERE id=?',
    [name, email, phone, id_card, event_id, req.params.id],
    (err) => {
      if (err) return res.status(500).send({ message: 'Database error', error: err.message });
      res.json({ message: 'Attendee updated' });
    });
});

app.delete('/api/attendees/:id', verifyToken, (req, res) => {
  db.query('DELETE FROM attendees WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).send({ message: 'Database error', error: err.message });
    res.json({ message: 'Attendee deleted' });
  });
});

/* ------------------- TICKETS ------------------- */
function generateTicketNumber() {
  return 'TICKET-' + Math.floor(100000 + Math.random() * 900000);
}

app.get('/api/tickets', verifyToken, (req, res) => {
  const query = `
    SELECT t.ticket_number, t.ticket_type,
           a.name AS attendee_name, a.email AS attendee_email,
           e.name AS event_name, e.location, e.date
    FROM tickets t
    JOIN attendees a ON t.attendee_id = a.id
    JOIN events e ON t.event_id = e.id
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).send({ message: 'Database error', error: err.message });
    res.json(results);
  });
});

app.get('/api/tickets/:ticket_number', verifyToken, (req, res) => {
  db.query(
    'SELECT * FROM tickets WHERE ticket_number = ?',
    [req.params.ticket_number],
    (err, results) => {
      if (err) return res.status(500).send({ message: 'Database error', error: err.message });
      if (results.length === 0) return res.status(404).json({ message: 'Ticket not found' });
      res.json(results[0]);
    }
  );
});

app.post('/api/tickets', verifyToken, (req, res) => {
  const { ticket_type, attendee_id, event_id } = req.body;
  const ticket_number = generateTicketNumber();

  db.query(
    'INSERT INTO tickets (ticket_number, ticket_type, attendee_id, event_id) VALUES (?, ?, ?, ?)',
    [ticket_number, ticket_type, attendee_id, event_id],
    (err, results) => {
      if (err) return res.status(500).send({ message: 'Database error', error: err.message });
      res.json({ message: 'Ticket issued', id: results.insertId, ticket_number, ticket_type, attendee_id, event_id });
    }
  );
});

app.put('/api/tickets/:ticket_number', verifyToken, (req, res) => {
  const { ticket_type, attendee_id, event_id } = req.body;

  db.query(
    'UPDATE tickets SET ticket_type = ?, attendee_id = ?, event_id = ? WHERE ticket_number = ?',
    [ticket_type, attendee_id, event_id, req.params.ticket_number],
    (err, results) => {
      if (err) return res.status(500).send({ message: 'Database error', error: err.message });
      if (results.affectedRows === 0) return res.status(404).json({ message: 'Ticket not found' });
      res.json({ message: 'Ticket updated', ticket_number: req.params.ticket_number });
    }
  );
});

app.delete('/api/tickets/:ticket_number', verifyToken, (req, res) => {
  db.query(
    'DELETE FROM tickets WHERE ticket_number = ?',
    [req.params.ticket_number],
    (err, results) => {
      if (err) return res.status(500).send({ message: 'Database error', error: err.message });
      if (results.affectedRows === 0) return res.status(404).json({ message: 'Ticket not found' });
      res.json({ message: 'Ticket deleted' });
    }
  );
});

/* ------------------- START SERVER ------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
