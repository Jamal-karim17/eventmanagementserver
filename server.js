const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// DB Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '7985', // Replace with your DB password
  database: 'event_mgmt_db'
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ Connected to MySQL');
});

// Generate unique ticket number
function generateTicketNumber() {
  return 'TICKET-' + Math.floor(100000 + Math.random() * 900000); // Example: TICKET-123456
}

/* ------------------- EVENTS ------------------- */

// GET all events
app.get('/api/events', (req, res) => {
  db.query('SELECT * FROM events', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// GET one event
app.get('/api/events/:id', (req, res) => {
  db.query('SELECT * FROM events WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results[0]);
  });
});

// CREATE event
app.post('/api/events', (req, res) => {
  const { name, location, date, capacity } = req.body;
  db.query('INSERT INTO events (name, location, date, capacity) VALUES (?, ?, ?, ?)',
    [name, location, date, capacity],
    (err, results) => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Event created', id: results.insertId });
    });
});

// UPDATE event
app.put('/api/events/:id', (req, res) => {
  const { name, location, date, capacity } = req.body;
  db.query(
    'UPDATE events SET name=?, location=?, date=?, capacity=? WHERE id=?',
    [name, location, date, capacity, req.params.id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Event updated' });
    });
});

// DELETE event
app.delete('/api/events/:id', (req, res) => {
  db.query('DELETE FROM events WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ message: 'Event deleted' });
  });
});

/* ------------------- ATTENDEES ------------------- */

// GET all attendees
app.get('/api/attendees', (req, res) => {
  db.query('SELECT * FROM attendees', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// GET one attendee
app.get('/api/attendees/:id', (req, res) => {
  db.query('SELECT * FROM attendees WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results[0]);
  });
});

// CREATE attendee
app.post('/api/attendees', (req, res) => {
  const { name, email, phone, id_card, event_id } = req.body;
  db.query('INSERT INTO attendees (name, email, phone, id_card, event_id) VALUES (?, ?, ?, ?, ?)',
    [name, email, phone, id_card, event_id],
    (err, results) => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Attendee added', id: results.insertId });
    });
});

// UPDATE attendee
app.put('/api/attendees/:id', (req, res) => {
  const { name, email, phone, id_card, event_id } = req.body;
  db.query(
    'UPDATE attendees SET name=?, email=?, phone=?, id_card=?, event_id=? WHERE id=?',
    [name, email, phone, id_card, event_id, req.params.id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Attendee updated' });
    });
});

// DELETE attendee
app.delete('/api/attendees/:id', (req, res) => {
  db.query('DELETE FROM attendees WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ message: 'Attendee deleted' });
  });
});

/* ------------------- TICKETS ------------------- */

// GET all tickets with JOINs
app.get('/api/tickets', (req, res) => {
  const query = `
    SELECT t.ticket_number, t.ticket_type,
           a.name AS attendee_name, a.email AS attendee_email,
           e.name AS event_name, e.location, e.date
    FROM tickets t
    JOIN attendees a ON t.attendee_id = a.id
    JOIN events e ON t.event_id = e.id
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// GET ticket by ticket_number
app.get('/api/tickets/:ticket_number', (req, res) => {
  db.query(
    'SELECT * FROM tickets WHERE ticket_number = ?',
    [req.params.ticket_number],
    (err, results) => {
      if (err) return res.status(500).send(err);
      if (results.length === 0) return res.status(404).json({ message: 'Ticket not found' });
      res.json(results[0]);
    }
  );
});

// CREATE ticket
app.post('/api/tickets', (req, res) => {
  const { ticket_type, attendee_id, event_id } = req.body;
  const ticket_number = generateTicketNumber();

  db.query(
    'INSERT INTO tickets (ticket_number, ticket_type, attendee_id, event_id) VALUES (?, ?, ?, ?)',
    [ticket_number, ticket_type, attendee_id, event_id],
    (err, results) => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Ticket issued', id: results.insertId, ticket_number, ticket_type, attendee_id, event_id });
    }
  );
});

// UPDATE ticket
app.put('/api/tickets/:ticket_number', (req, res) => {
  const { ticket_type, attendee_id, event_id } = req.body;

  db.query(
    'UPDATE tickets SET ticket_type = ?, attendee_id = ?, event_id = ? WHERE ticket_number = ?',
    [ticket_type, attendee_id, event_id, req.params.ticket_number],
    (err, results) => {
      if (err) return res.status(500).send(err);
      if (results.affectedRows === 0) return res.status(404).json({ message: 'Ticket not found' });
      res.json({ message: 'Ticket updated', ticket_number: req.params.ticket_number });
    }
  );
});

// DELETE ticket
app.delete('/api/tickets/:ticket_number', (req, res) => {
  db.query(
    'DELETE FROM tickets WHERE ticket_number = ?',
    [req.params.ticket_number],
    (err, results) => {
      if (err) return res.status(500).send(err);
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
