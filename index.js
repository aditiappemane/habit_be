// server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Initialize app
const app = express();
const PORT = 5000;
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

// Middleware
app.use(cors());
app.use(express.json()); 




// Database Connection
mongoose.connect(
  'mongodb+srv://appemaneaditi:aditimongodb@cluster0.xxvd5jd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
)
.then(() => console.log('✅ Connected to MongoDB'))
.catch((err) => console.error('❌ MongoDB connection error:', err));


const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
});
const User = mongoose.model('User', userSchema);

// Todo Schema
const todoSchema = new mongoose.Schema({
  task: { type: String, required: true },
  completed: { type: Boolean, default: false },
  userId: { type: String, required: true },
});
const Todo = mongoose.model('Todo', todoSchema);


app.get('/', (req, res) => {
  res.send('✅ Todo API Running');
});



// Signup
app.post('/api/signup', async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const exists = await User.findOne({ email });
      if (exists) {
        return res.status(400).json({ message: 'User already exists' });
      }
  
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const newUser = new User({ email, password: hashedPassword });
      await newUser.save();
  
      res.status(201).json({
        message: 'Signup successful',
        userId: newUser._id,
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

// Login
app.post('/api/login', async (req, res) => {
    console.log("Login Request Body:", req.body);

    const { email, password } = req.body;
  
    try {
      const user = await User.findOne({ email });
      if (!user) {
        console.log("User not found");
        return res.status(404).json({ message: 'Account not exist' });
      }
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log("Password does not match");
        return res.status(400).json({ message: 'Wrong password' });
      }

  
      res.json({
        message: 'Login successful',
        userId: user._id,
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });




app.get('/api/todos', async (req, res) => {
    const { userId } = req.query;
    console.log("1",userId)
  
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    console.log("2",userId)
    try {
      const todos = await Todo.find({ userId });
      console.log("3",todos)
      res.json(todos);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch todos" });
    }
  })

app.post('/todos', async (req, res) => {
  const { task, userId } = req.body;

  if (!task || !userId) {
    return res.status(400).json({ message: 'Task and userId are required' });
  }

  try {
    const newTodo = new Todo({ task, userId });
    await newTodo.save();
    res.status(201).json(newTodo);
  } catch (err) {
    res.status(500).json({ message: 'Error adding todo' });
  }
});


app.patch('/todos/:id', async (req, res) => {
    const { id } = req.params;
    const { completed, task } = req.body;
  
  
    try {
      const updatedFields = {};
      if (typeof completed === 'boolean') updatedFields.completed = completed;
      if (task !== undefined) updatedFields.task = task;
  
  
      const updatedTodo = await Todo.findByIdAndUpdate(id, updatedFields, { new: true });
      res.json(updatedTodo);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  


app.delete('/todos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await Todo.findByIdAndDelete(id);
    res.json({ message: 'Todo deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});