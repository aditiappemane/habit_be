// server.js

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dayjs = require("dayjs");

// Initialize app
const app = express();
const PORT = 5000;
const bcrypt = require("bcrypt");
const SALT_ROUNDS = 10;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose
  .connect(
    "mongodb+srv://appemaneaditi:aditimongodb@cluster0.xxvd5jd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
});
const User = mongoose.model("User", userSchema);

// Todo Schema
const todoSchema = new mongoose.Schema({
  task: { type: String, required: true },
  completed: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.ObjectId, ref: "user", required: true },
  startDate: Date,
  selectedDates: [Date], // array of dates
  targetDays: [], // comma-separated days like "Monday, Wednesday"
});

const Todo = mongoose.model("Todo", todoSchema);

const habitEntrySchema = new mongoose.Schema({
  habitId: { type: mongoose.Schema.ObjectId, ref: "Todo", required: true }, // or another model if not Todo
  userId: { type: mongoose.Schema.ObjectId, ref: "user", required: true },
  date: { type: String, required: true }, // store in 'YYYY-MM-DD' format
  status: { type: String, enum: ["completed", "missed"], default: "missed" },
});

const HabitEntry = mongoose.model("HabitEntry", habitEntrySchema);

app.get("/", (req, res) => {
  res.send("✅ Todo API Running");
});

// Signup
app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body;

  try {
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({
      message: "Signup successful",
      userId: newUser._id,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  console.log("Login Request Body:", req.body);

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "Account not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Password does not match");
      return res.status(400).json({ message: "Wrong password" });
    }

    res.json({
      message: "Login successful",
      userId: user._id,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.get("/api/todos", async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "UserId is required" });
  }

  try {
    const todos = await Todo.find({ userId });
    res.json(todos);
  } catch (err) {
    console.error("Error fetching todos:", err);
    res.status(500).json({ message: "Error fetching todos" });
  }
});

app.post("/todos", async (req, res) => {
  const { task, userId, selectedDates, targetDays, startDate } = req.body;

  if (!task || !userId) {
    return res.status(400).json({ message: "Task and userId are required" });
  }

  try {
    const newTodo = new Todo({
      task,
      userId,
      selectedDates,
      targetDays,
      startDate,
    });

    await newTodo.save();
    res.status(201).json(newTodo);
  } catch (err) {
    console.error("Error saving todo:", err);
    res.status(500).json({ message: "Error adding todo" });
  }
});

app.patch("/todos/:id", async (req, res) => {
  const { id } = req.params;
  const { completed, task } = req.body;

  try {
    const updatedFields = {};
    if (typeof completed === "boolean") updatedFields.completed = completed;
    if (task !== undefined) updatedFields.task = task;

    const updatedTodo = await Todo.findByIdAndUpdate(id, updatedFields, {
      new: true,
    });
    res.json(updatedTodo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/todos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await Todo.findByIdAndDelete(id);
    res.json({ message: "Todo deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/habits/today", async (req, res) => {
    const { userId } = req.query;
  
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }
  
    const todayDayName = dayjs().format("dddd");
    const today = dayjs().startOf('day'); // Strip time for accurate comparison
    console.log("todayDayName",todayDayName)
    console.log("today",today)
    try {
      const todos = await Todo.find({ userId });
      console.log("todostodays",todos)
      // Filter todos based on selectedDates OR recurring logic
      const habitsToday = todos.filter(todo => {
        // Skip if targetDays doesn't include today's day name
        if (!todo.targetDays?.includes(todayDayName)) return false;
      
        // Skip if startDate is in the past
        if (todo.startDate) {
          const startDate = dayjs(
            todo.startDate
          ).startOf('day'); // normalize to compare only date
          console.log("startDate",startDate)
          console.log(startDate.isSame(today))
          console.log(startDate.isBefore(today))
          return startDate.isSame(today) || startDate.isBefore(today);
        }
      
        return true; // if no startDate, allow by default
      });
      console.log("habitsToday",habitsToday)
      res.json(habitsToday);
    } catch (err) {
      console.error("Error fetching today's habits:", err);
      res.status(500).json({ message: "Error fetching today's habits" });
    }
  });
  
// POST or PATCH habit status
app.post("/api/habits/checkin", async (req, res) => {
    const { habitId, userId, status } = req.body;
  
    if (!habitId || !userId || !["completed", "missed"].includes(status)) {
      return res.status(400).json({ message: "Invalid input" });
    }
  
    const today = dayjs().format("YYYY-MM-DD");
  
    try {
      const existingEntry = await HabitEntry.findOne({ habitId, userId, date: today });
  
      if (existingEntry) {
        existingEntry.status = status;
        await existingEntry.save();
        return res.json({ message: "Status updated", entry: existingEntry });
      } else {
        const newEntry = new HabitEntry({ habitId, userId, date: today, status });
        await newEntry.save();
        return res.status(201).json({ message: "Status recorded", entry: newEntry });
      }
    } catch (err) {
      console.error("Error recording status:", err);
      res.status(500).json({ message: "Failed to log habit status" });
    }
  });




  app.get("/api/habits/statuses", async (req, res) => {
    const { userId } = req.query;
    const date = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  
    try {
      const statuses = await HabitEntry.find({ userId, date });
      res.json(statuses);
    } catch (err) {
      console.error("Error fetching statuses:", err);
      res.status(500).json({ message: "Failed to fetch statuses" });
    }
  });
  

  app.get("/api/habits/streaks", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ message: "userId is required" });

  try {
    const entries = await HabitEntry.find({ userId }).sort({ date: 1 });

    const habitStreaks = {};

    const grouped = entries.reduce((acc, entry) => {
      if (!acc[entry.habitId]) acc[entry.habitId] = [];
      acc[entry.habitId].push(entry);
      return acc;
    }, {});

    for (const habitId in grouped) {
      const logs = grouped[habitId];
      let currentStreak = 0;
      let longestStreak = 0;
      let lastDate = null;

      logs.forEach(({ date, status }) => {
        if (status !== "completed") {
          currentStreak = 0;
          return;
        }

        const dateObj = dayjs(date);
        if (lastDate && dateObj.diff(lastDate, "day") === 1) {
          currentStreak += 1;
        } else if (!lastDate || dateObj.diff(lastDate, "day") > 1) {
          currentStreak = 1;
        }

        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }

        lastDate = dateObj;
      });

      habitStreaks[habitId] = {
        currentStreak,
        longestStreak,
      };
    }

    res.json(habitStreaks);
  } catch (err) {
    console.error("Error calculating streaks:", err);
    res.status(500).json({ message: "Failed to calculate streaks" });
  }
});

  
  
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});