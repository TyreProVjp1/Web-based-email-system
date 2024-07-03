const express = require('express');
const cookieParser = require('cookie-parser');
const ejs = require('ejs');
const mysql = require('mysql2');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');

const connection = mysql.createConnection({
  host: 'localhost',
  port: 3306,
  database: 'wpr2023',
  user: 'wpr',
  password: 'fit2023'
});
const checkAuth = (req, res, next) => {
  if (req.cookies.userId) {
    next();
  } else {
    res.redirect('/');
  }
};
//Sign in
app.get('/', (req, res) => {
  if (req.cookies.userId) {
    res.redirect('/inbox');
    return;
  }

  res.render('signin', { errorMessage: null });
});

app.post('/signin', (req, res) => {
  const { email, password } = req.body;

  connection.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal server error');
      return;
    }

    if (result.length === 0) {
      res.render('signin', { errorMessage: 'Invalid login credentials' });
      return;
    }

    const user = result[0];
res.cookie('userId', user.id, { maxAge: 3600000 });
res.redirect('/inbox');
});
});
// Sign-up
app.get('/signup', (req, res) => {
  res.render('signup', { errorMessage: '' });
});

app.post('/signup', (req, res) => {
  const { fullName, email, password, reenterPassword } = req.body;
  if (fullName=="" || email=="" || password=="" || reenterPassword=="") {
    return res.render('signup', { errorMessage: 'All fields are required' });
  }

  if (password.length < 6) {
    return res.render('signup', { errorMessage: 'Password must be at least 6 characters long' });
  }

  if (password == reenterPassword) {
    return res.render('signup', { errorMessage: 'Passwords do not match' });
  }
  connection.query('SELECT * FROM users WHERE email = ?', [email], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal server error');
      return;
    }

    if (result.length > 0) {
      return res.render('signup', { errorMessage: 'Email address is already used' });
    }
    connection.query('INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)', [fullName, email, password], (err) => {
      if (err) {
        console.error(err);
        res.status(500).send('Internal server error');
        return;
      }
      res.render('signin', { welcomeMessage: 'Account created successfully! Please sign in.' });
    });
  });
});
//Inbox
app.get('/inbox', checkAuth, (req, res) => {
  const userId = req.cookies.userId;
  let currentPage = req.query.page || 1;
  const emailsPerPage = 5;
  connection.query('SELECT full_name FROM users WHERE id = ?', [userId], (err, userResult) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal server error');
      return;
    }

    const userFullName = userResult[0].full_name;
    connection.query(`
      SELECT e.*, u.full_name as sender_name
      FROM emails e
      JOIN users u ON e.sender_id = u.id
      WHERE e.recipient_id = ?
    `, [userId], (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send('Internal server error');
        return;
      }

      const emails = result;
      connection.query('SELECT COUNT(*) as total FROM emails WHERE recipient_id = ?', [userId], (err, countResult) => {
        if (err) {
          console.error(err);
          res.status(500).send('Internal server error');
          return;
        }
        const totalEmails = countResult[0].total;
        const totalPages = Math.ceil(totalEmails / emailsPerPage);

        const hasPrevPage = currentPage > 1;
        const hasNextPage = currentPage < totalPages;

        res.render('inbox', { userFullName, emails, currentPage, totalPages, hasPrevPage, hasNextPage });
      });
    });
  });
});

// Outbox
app.get('/outbox', checkAuth, (req, res) => {
  const userId = req.cookies.userId;
  let currentPage = req.query.page || 1;
  const emailsPerPage = 5;
  connection.query(`
  SELECT e.*, u.full_name as recipient_name
  FROM emails e
  JOIN users u ON e.recipient_id = u.id
  WHERE e.sender_id = ?
`, [userId], (err, result) => {
  if (err) {
    console.error(err);
    res.status(500).send('Internal server error');
    return;
  }
    const emails = result;
    connection.query('SELECT full_name FROM users WHERE id = ?', [userId], (err, userResult) => {
      if (err) {
        console.error(err);
        res.status(500).send('Internal server error');
        return;
      }

      const userFullName = userResult[0].full_name;
      const totalEmails = emails.length;
      const totalPages = Math.ceil(totalEmails / emailsPerPage);

      const hasPrevPage = currentPage > 1;
      const hasNextPage = currentPage < totalPages;

      res.render('outbox', { userFullName, emails, currentPage, hasPrevPage, hasNextPage, totalPages });
    });
  });
});
//Compose
app.get('/compose', checkAuth, (req, res) => {
  const userId = req.cookies.userId;
  connection.query('SELECT id, full_name FROM users WHERE id <> ?', [userId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal server error');
      return;
    }

    const recipients = result;
    connection.query('SELECT full_name FROM users WHERE id = ?', [userId], (err, userResult) => {
      if (err) {
        console.error(err);
        res.status(500).send('Internal server error');
        return;
      }

      const userFullName = userResult[0].full_name;

      res.render('compose', { userFullName, recipients });
    });
  });
});
app.post('/compose', checkAuth, (req, res) => {
  const { recipientId, subject, body } = req.body;
  const senderId = req.cookies.userId;
  connection.query(
    'INSERT INTO emails (sender_id, recipient_id, subject, body) VALUES (?, ?, ?, ?)',
    [senderId, recipientId, subject, body],
    (err) => {
      if (err) {
        console.error(err);
        res.status(500).send('Internal server error');
        return;
      }

      res.redirect('/inbox');
    }
  );
});

app.get('/email-detail/:id', checkAuth, (req, res) => {
  const userId = req.cookies.userId;
  const emailId = req.params.id;
  connection.query(`
    SELECT e.*, u.full_name as sender_name, r.full_name as recipient_name
    FROM emails e
    JOIN users u ON e.sender_id = u.id
    JOIN users r ON e.recipient_id = r.id
    WHERE e.id = ? AND (e.sender_id = ? OR e.recipient_id = ?)
  `, [emailId, userId, userId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal server error');
      return;
    }
    const email = result[0];

    if (!email) {
      res.status(404).send('Email not found');
      return;
    }
    connection.query('SELECT full_name FROM users WHERE id = ?', [userId], (err, userResult) => {
      if (err) {
        console.error(err);
        res.status(500).send('Internal server error');
        return;
      }

      const userFullName = userResult[0].full_name;

      res.render('email-detail', { userFullName, email });
    });
  });
});



app.get('/access-denied', (req, res) => {
  res.status(403).render('access-denied');
});
//Sign out
app.get('/signout', (req, res) => {
  res.clearCookie('userId');
  res.clearCookie('loggedIn');
  res.redirect('/');
});


app.listen(8000, () => {
  console.log('Server started on port 8000');
});