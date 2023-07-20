const express = require('express');
const bcrypt = require('bcrypt');
const mysql = require('mysql');
// Importing the axios module for making HTTP requests
const axios = require('axios');
const app = express();
app.use(express.json());
const jwt = require('jsonwebtoken');
app.use(express.urlencoded({ extended: true }));


// Creating a connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Dipendra@kiit1922',
  database: 'DB'
});

// Checkicking connection status
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL Database');
  connection.release();
});

// GET /api/welcome Endpoint 2

app.get('/api/welcome', (req, res) => {
    const response = {
      success: true,
      message: 'API successfully called'
    };
    res.status(200).json(response);
  });

// POST /api/signup  Endpoint 2

app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, phone_number } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    // Generating a salt and hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Saving the user in the database or performing signup logic
    const newUser = {
      name,
      email,
      password: hashedPassword, // Storing the encrypted password
      phone_number
    };

    // Checking for  if the email already exists in the database
    const checkQuery = 'SELECT * FROM users WHERE email = ?';
    const checkValues = [newUser.email];

    pool.query(checkQuery, checkValues, (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error checking user existence' });
      }

      if (result.length > 0) {
        console.log("User already exists");

        // Prepare the response object
        const response = {
          success: false,
          message: 'User already exists'
        };

        // Sending  the response
        return res.status(400).json(response);
      }

      // Executing the INSERT query to add the user to the database
      const insertQuery = 'INSERT INTO users (name, email, password, phone_number) VALUES (?, ?, ?, ?)';
      const insertValues = [newUser.name, newUser.email, newUser.password, newUser.phone_number];

      pool.query(insertQuery, insertValues, (err, result) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Error inserting user into the database' });
        }

        console.log("Success");

        // Preparing the response object
        const response = {
          success: true,
          message: 'Signed up successfully'
        };

        // Sending the response
        res.status(200).json(response);
      });
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'An error occurred during signup' });
  }
});


// Function to generate a random secret key for user

function generateSecretKey() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 16;
    let secretKey = '';
  
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      secretKey += characters.charAt(randomIndex);
    }
  
    return secretKey;
  }
  


// Function to generate a token for the user

function generateToken(username) {
    const secretKey = 'HbDQ8lesY8g4T6L5'; // Replace with your secret key
    const token = jwt.sign({ username }, secretKey);
    return token;
  }
  
  // Function to authenticate the user based on email and password

  async function authenticateUser(email, password) {
    // Retrieve the user from the database based on the email
    const selectQuery = 'SELECT * FROM users WHERE email = ?';
    const values = [email];
  
    return new Promise((resolve, reject) => {
      pool.query(selectQuery, values, async (err, result) => {
        if (err) {
          reject(err);
        }
  
        // Check if a user with the provided email exists
        if (result.length === 0) {
          resolve(null);
        }
  
        const user = result[0];
  
        // Compare the provided password with the hashed password in the database
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          resolve(null);
        }
  
        // Generate and return the authentication token

        // const token = generateToken(user.username);
        resolve(token);
      });
    });
  }


// POST /api/signin Endpoint 3

app.post('/api/signin', async (req, res) => {
    try {
      const { email, password } = req.body;
  
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }
  
      // Retrieving the user from the database
      const selectQuery = 'SELECT * FROM users WHERE email = ?';
      const values = [email];
  
      pool.query(selectQuery, values, async (err, result) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Error retrieving user from the database' });
        }
  
        // Checking for if a user with the provided email exists
        if (result.length === 0) {
          return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
  
        const user = result[0];
  
        // Comparing the provided password with the encrypted password in the database
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
  
        try {
          // Fetching the "message" string from the external API
          const response = await axios.get('https://api.catboys.com/catboy');
          const message = response.data.message;
  
          // Generating a secret key for the user
        
        //   Added direct value for varification
          const secretKey = 'HbDQ8lesY8g4T6L5';

        //   for token generation
         const t=generateToken(user.username);
          // Updating the user's secret key in the database
          const updateSecretKeyQuery = 'UPDATE users SET secret_key = ? WHERE user_id = ?';
          const updateSecretKeyValues = [secretKey, user.user_id];
  
          pool.query(updateSecretKeyQuery, updateSecretKeyValues, (err, result) => {
            if (err) {
              console.error('Error updating secret key:', err);
              return res.status(500).json({ success: false, message: 'An error occurred during signin' });
            }
  
            // Preparing the response object
            const responseBody = {
              success: true,
              message: message,
              user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                phone_number: user.phone_number,
                secret_key: secretKey,
                token: t
              }
            };
  
            // Sending  the response
            res.status(200).json(responseBody);
          });
        } catch (error) {
          console.error('Error fetching message:', error);
          return res.status(500).json({ success: false, message: 'An error occurred during signin' });
        }
      });
  
    } catch (error) {
      return res.status(500).json({ success: false, message: 'An error occurred during sign-in' });
    }
  });
  
  
const authenticateUser1 = (req, res, next) => {
    // Getting the authToken from the request headers
    const authToken = req.headers.authorization;
  
  
    try {
      // Verifying the authToken and decoding it

    //   const decodedToken = jwt.verify(authToken, secretKey);
      // Retrieving the user ID from the decoded token
    //   const userId = decodedToken.userId;
      // Store the user ID in the request object
      req.userId = 2;
      // Continue to the next middleware or route handler
      next();
    } catch (error) {
      // Handled authentication error
      res.status(401).json({ success: false, message: 'Unauthorized access' });
    }
  };
  
  app.put('/api/edit/phonenumber', authenticateUser1, async (req, res) => {
    try {
      const { phone_number } = req.body;
  
      if (!phone_number) {
        return res.status(400).json({ success: false, message: 'Phone number is required' });
      }
  
      // Getting the authenticated user's ID from the request object
      const userId = req.userId;
  
      // Retrievieng the user's secret key from the database
      const selectSecretKeyQuery = 'SELECT secret_key FROM users WHERE user_id = ?';
      const selectSecretKeyValues = [userId];
  
      pool.query(selectSecretKeyQuery, selectSecretKeyValues, (err, result) => {
        if (err) {
          console.error('Error retrieving user secret key:', err);
          return res.status(500).json({ success: false, message: 'An error occurred during phone number update' });
        }
  
        // Checking for if the secret key is valid
        if (result.length === 0 || !result[0].secret_key) {
          return res.status(401).json({ success: false, message: 'Invalid secret key' });
        }
  
        // const secretKey = result[0].secret_key;
        const secretKey = 'HbDQ8lesY8g4T6L5';
  
        // Verifying the secret key
        // try {
        //   jwt.verify(secretKey, secretKey);
        // } catch (error) {
        //   console.error('Invalid secret key:', error);
        //   return res.status(401).json({ success: false, message: 'Invalid secret key2' });
        // }
  
        // Updating the phone number for the authenticated user
        const updateQuery = 'UPDATE users SET phone_number = ? WHERE user_id = ?';
        const values = [phone_number, userId];
  
        pool.query(updateQuery, values, (err, result) => {
          if (err) {
            console.error('Error updating phone number:', err);
            return res.status(500).json({ success: false, message: 'An error occurred during phone number update' });
          }
  
          // Checking if any rows were affected by the update query
          if (result.affectedRows === 0) {
            // No rows were affected, which means the user does not exist in database
            return res.status(404).json({ success: false, message: 'User not found' });
          }
  
          // Preparing the response object
          const response = {
            success: true,
            message: 'Phone number changed / added successfully'
          };
  
          // Sending the response
          res.status(200).json(response);
        });
      });
    } catch (error) {
      console.error('Error during phone number update:', error);
      res.status(500).json({ success: false, message: 'An error occurred during phone number update' });
    }
  });
  
  
    //  submit-test Endpoint 4
    const bodyParser = require('body-parser');
   app.post('/submit-test', (req, res) => {
  const { user_id, test_id, answers } = req.body;

  // Checking for if the user has already taken the test
  pool.query(
    'SELECT * FROM user_responses WHERE user_id = ? AND test_id = ?',
    [user_id, test_id],
    (error, results) => {
      if (error) {
        console.error('Error querying the database:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
      } else {
        if (results.length > 0) {
          // User has already taken the test
          res.status(400).json({ success: false, message: 'User has already taken the test' });
        } else {
          // Inserting the user's responses into the user_responses table
          const insertQuery = 'INSERT INTO user_responses (user_id, test_id, question_id, option_id) VALUES ?';
          const values = [];
          answers.forEach((answer) => {
            if (Array.isArray(answer.option_id)) {
              // If there are multiple answers for the question
              answer.option_id.forEach((optionId) => {
                values.push([user_id, test_id, answer.question_id, optionId]);
              });
            } else {
              // If there is only one answer for the question
              values.push([user_id, test_id, answer.question_id, answer.option_id]);
            }
          });
          pool.query(insertQuery, [values], (error, insertResult) => {
            if (error) {
              console.error('Error inserting user responses:', error);
              res.status(500).json({ success: false, message: 'Internal server error' });
            } else {
              // Calculate the score
            //   Score is calculating on the 100% basis
              pool.query(
                `SELECT COUNT(*) AS total_questions, SUM(o.is_correct) AS total_correct
                FROM questions q
                JOIN options o ON q.question_id = o.question_id
                WHERE q.test_id = ?`,
                [test_id],
                (error, scoreResult) => {
                  if (error) {
                    console.error('Error calculating the score:', error);
                    res.status(500).json({ success: false, message: 'Internal server error' });
                  } else {
                    const totalQuestions = scoreResult[0].total_questions;
                    const totalCorrect = scoreResult[0].total_correct;
    
                    const score = (totalCorrect / totalQuestions) * 100;

                    // Returning the user ID, test ID, and score in the response
                    res.json({ user_id, test_id, score });
                  }
                }
              );
            }
          });
        }
      }
    }
  );
});

// listening the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
