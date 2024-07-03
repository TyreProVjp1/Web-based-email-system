const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: 'localhost',
  port: 3306,
  database: 'wpr2023',
  user: 'wpr',
  password: 'fit2023'
});
connection.connect();
const createUserTable = `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
  );
`;
const createEmailTable = `
  CREATE TABLE IF NOT EXISTS emails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT,
    recipient_id INT,
    subject VARCHAR(255),
    body TEXT,
    attachment_path VARCHAR(255),
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (recipient_id) REFERENCES users(id)
  );
`;
const insertUsersData = `
  INSERT INTO users (full_name, email, password) VALUES
  ('User 1', 'a@a.com', '123456'),
  ('User 2', 'b@b.com', '123456'),
  ('User 3', 'c@c.com', '123456');
`;
const insertEmailsData = `
  INSERT INTO emails (sender_id, recipient_id, subject, body) VALUES
  (1, 2, 'Hello', 'Do you finished your WPR Assignment?'),
  (2, 1, 'Re: Hello', 'I have done it, and you?'),
  (1, 3, 'Huhu', 'Im crying!!'),
  (3, 1, 'Re: Huhu', 'Why are you crying?'),
  (1, 2, 'Huhu', 'Im can not finish it.'),
  (2, 1, 'Re: Huhu', 'Co len, I will help you.'),
  (2, 3, 'Hey', 'I know you have done your assignment, wanna hang out?'),
  (3, 2, 'Re: Hey', 'Sure'),
  (3, 1, 'Re: Huhu', 'Im going out!!'),
  (1, 2, 'Huhu', 'Im crying so hard');
`;

connection.query(createUserTable, (err) => {
  if (err) throw err;
  console.log('Users table created successfully!');
});

connection.query(createEmailTable, (err) => {
  if (err) throw err;
  console.log('Emails table created successfully!');
});

connection.query(insertUsersData, (err) => {
  if (err) throw err;
  console.log('Users data inserted successfully!');
});

connection.query(insertEmailsData, (err) => {
  if (err) throw err;
  console.log('Emails data inserted successfully!');
});

connection.end();