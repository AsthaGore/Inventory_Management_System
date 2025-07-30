
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const path = require('path');
const app = express();
const port = 3000;

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Gayatri@123',
  database: 'inventory_database'
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ MySQL Connected');
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// Routes

// Home Page
app.get('/', (req, res) => {
  res.render('index');
});

// Register Page
app.get('/register', (req, res) => {
  res.render('register');
});

// Handle Register
app.get('/do-register', (req, res) => {
  const { emailId, password, role } = req.query;
  if (!emailId || !password || !role) {
    return res.send('Please fill all fields.');
  }
  const sql = 'INSERT INTO users (emailId, password, role) VALUES (?, ?, ?)';
  db.query(sql, [emailId, password, role], (err) => {
    if (err) {
      console.log(err);
      return res.send('Error during registration.');
    }
    res.send('✅ Registered successfully! <a href="/login">Go to Login</a>');
  });
});

// Login Page
app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/do-login', (req, res) => {
  const { emailId, password } = req.query;
  console.log('Attempting login with:', emailId, password);

  if (!emailId || !password) {
    return res.send('Please fill all fields.');
  }

  const sql = 'SELECT * FROM users WHERE emailId = ? AND password = ?';
  db.query(sql, [emailId, password], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.send('Server error.');
    }

    console.log('Query Results:', results);

    if (results.length > 0) {
      const user = results[0];
      if (user.role === 'admin') {
        // res.redirect(`/admin?emailId=${emailId}`);
        res.redirect(`/admin?emailId=${req.query.emailId}`);

      } else {
        res.redirect(`/student?emailId=${emailId}`);
      }
    } else {
      res.send('Invalid login. <a href="/login">Try again</a>');
    }
  });
});


// Admin Page
// app.get('/admin', (req, res) => {
//   const { emailId } = req.query;
//   db.query('SELECT * FROM items', (err, items) => {
//     if (err) throw err;
//     db.query(`
//       SELECT purchases.id, users.emailId, items.name AS item_name, purchases.quantity, purchases.status
//       FROM purchases
//       JOIN users ON purchases.student_id = users.id
//       JOIN items ON purchases.item_id = items.id
//     `, (err, purchases) => {
//       if (err) throw err;
//       res.render('admin', { items, purchases, emailId });
      
//  // pass EmailId if you need it
//     });
//   });
// });
// Admin Page
app.get('/admin', (req, res) => {
  const { emailId } = req.query;
  db.query('SELECT * FROM items', (err, items) => {
    if (err) throw err;
    db.query(`
      SELECT purchases.id, users.emailId AS student_emailId, items.name AS item_name, items.vendor AS vendor_name, purchases.quantity, purchases.status
      FROM purchases
      JOIN users ON purchases.student_id = users.id
      JOIN items ON purchases.item_id = items.id
    `, (err, purchases) => {
      if (err) throw err;
      console.log('Purchases result:', purchases);  // ✅ Debug print here!
      res.render('admin', { items, purchases, emailId });
    });
  });
});


// Mark as Paid
// app.get('/mark-paid/:id', (req, res) => {
//   const purchaseId = req.params.id;
//   db.query('UPDATE purchases SET status = "paid" WHERE id = ?', [purchaseId], (err) => {
//     if (err) throw err;
//     res.redirect('/admin');
//   });
// });
app.get('/mark-paid/:id', (req, res) => {
  const { emailId } = req.query;  // get emailId from query
  const purchaseId = req.params.id;
  db.query('UPDATE purchases SET status = "paid" WHERE id = ?', [purchaseId], (err) => {
    if (err) throw err;
    res.redirect(`/admin?emailId=${emailId}`);
  });
});


// Student Page
app.get('/student', (req, res) => {
  db.query('SELECT * FROM items WHERE quantity > 0', (err, items) => {
    if (err) throw err;
    res.render('student', { items, emailId: req.query.emailId });
  });
});

// Handle Purchase
// app.get('/purchase', (req, res) => {
//   const { emailId, item_id, quantity } = req.query;
//   if (!emailId || !item_id || !quantity) {
//     return res.send('Please fill all fields.');
//   }
//   db.query('SELECT * FROM users WHERE emailId = ?', [emailId], (err, users) => {
//     if (err) throw err;
//     if (users.length === 0) return res.send('Student not found.');
//     const student_id = users[0].id;
//     db.query('SELECT * FROM items WHERE id = ?', [item_id], (err, items) => {
//       if (err) throw err;
//       if (items.length === 0) return res.send('Item not found.');
//       const price = items[0].price;
//       const total_price = price * quantity;
//       db.query('INSERT INTO purchases (student_id, item_id, quantity, total_price) VALUES (?, ?, ?, ?)',
//         [student_id, item_id, quantity, total_price],
//         (err) => {
//           if (err) throw err;
//           // db.query('UPDATE items SET quantity = quantity - ? WHERE id = ?', [quantity, item_id], (err) => {
//           //   if (err) throw err;
//           //   res.send('✅ Purchase successful! <a href="/student?emailId=' + EmailId + '">Back</a>');
//           // });
//           res.send('✅ Purchase successful! <a href="/student?emailId=' + emailId + '">Back</a>');

//         }
//       );
//     });
//   });
// });
app.get('/purchase', (req, res) => {
  const { emailId, item_id, quantity } = req.query;
  if (!emailId || !item_id || !quantity) {
    return res.send('Please fill all fields.');
  }
  db.query('SELECT * FROM users WHERE emailId = ?', [emailId], (err, users) => {
    if (err) throw err;
    if (users.length === 0) return res.send('Student not found.');
    const student_id = users[0].id;
    db.query('SELECT * FROM items WHERE id = ?', [item_id], (err, items) => {
      if (err) throw err;
      if (items.length === 0) return res.send('Item not found.');
      const price = items[0].price;
      const total_price = price * quantity;
      db.query('INSERT INTO purchases (student_id, item_id, quantity, total_price) VALUES (?, ?, ?, ?)',
        [student_id, item_id, quantity, total_price],
        (err) => {
          if (err) throw err;
          // Don't update quantity here (trigger handles it)
          res.send(`✅ Purchase successful! <a href="/student?emailId=${emailId}">Back</a>`);
        }
      );
    });
  });
});

app.get('/student/items', (req, res) => {
  const query = 'SELECT id, name, price FROM items';
  db.query(query, (err, results) => {
      if (err) {
          console.error('Error fetching items:', err);
          res.status(500).json({ error: 'Failed to fetch items' });
      } else {
          res.json(results);
      }
  });
});


//to save data from frontend
app.get('/api/savePurchase', (req, res) => {
  const { emailId, item_id, quantity, total_price } = req.query;

  // 1️⃣ Find student ID based on emailId (assuming you have a Users table)
  const userSql = 'SELECT id FROM users WHERE emailId = ?';
  db.query(userSql, [emailId], (err, userResult) => {
      if (err) return res.json({ success: false, message: 'DB error' });
      if (userResult.length === 0) return res.json({ success: false, message: 'User not found' });

      const user_id = userResult[0].id;

      // 2️⃣ Insert into Purchases table
      const insertSql = `
          INSERT INTO Purchases (user_id, item_id, quantity, total_price, status)
          VALUES (?, ?, ?, ?, 'unpaid')
      `;
      db.query(insertSql, [user_id, item_id, quantity, total_price], (err, result) => {
          if (err) {
              console.error(err);
              return res.json({ success: false, message: 'Failed to save purchase' });
          }
          res.json({ success: true, message: 'Purchase saved successfully' });
      });
  });
});

// Start the server
app.use(express.json());

app.post('/add-purchase', (req, res) => {
  const { student_id, item_id, quantity, total_price, status, purchase_date } = req.body;

  if (!student_id || !item_id || !quantity || !total_price || !status || !purchase_date) {
      return res.json({ success: false, error: 'Missing required fields' });
  }

  const sql = `
      INSERT INTO purchases (student_id, item_id, quantity, total_price, status, purchase_date)
      VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [student_id, item_id, quantity, total_price, status, purchase_date], (err, result) => {
      if (err) {
          console.error('DB insert error:', err);
          return res.json({ success: false, error: 'Database error' });
      }
      res.json({ success: true, id: result.insertId });
  });
});

app.get('/student/purchases', (req, res) => {
  const studentId = 1; // Replace with real session-based or token-based ID

  const sql = `
      SELECT purchases.*, items.name AS item_name
      FROM purchases
      JOIN items ON purchases.item_id = items.id
      WHERE purchases.student_id = ?
      ORDER BY purchases.purchase_date DESC
  `;

  db.query(sql, [studentId], (err, results) => {
      if (err) {
          console.error('Error fetching purchases:', err);
          return res.status(500).json({ success: false, error: 'DB error' });
      }
      res.json({ success: true, data: results });
  });
});

app.delete('/delete-purchase/:id', (req, res) => {
  const purchaseId = req.params.id;  // Capture ID from URL parameters
  console.log('Attempting to delete purchase with ID:', purchaseId);  // Check if ID is correctly captured

  const query = 'DELETE FROM purchases WHERE id = ?';

  db.query(query, [purchaseId], (err, result) => {
      if (err) {
          console.error('Error deleting purchase:', err);
          return res.status(500).json({ success: false, error: 'Database error' });
      }
      res.json({ success: true });
  });
});





app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
