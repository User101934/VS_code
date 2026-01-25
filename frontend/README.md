# TeachGrid VS 🚀

**TeachGrid VS** is a powerful, web-based Integrated Development Environment (IDE) designed for education and rapid prototyping. It provides a ZERO-SETUP coding environment that feels just like VS Code but runs entirely in your browser.

![TeachGrid VS](https://placehold.co/800x400?text=TeachGrid+VS+Preview)

## ✨ Key Features

### 1. ⚡ Zero-Setup Execution
Write and run code in **20+ languages** (Python, Java, C++, JavaScript, Go, Rust, etc.) instantly. No need to install compilers on your machine.

### 2. 📦 Smart Dependency Management (Auto-Magic)
Stop fighting with `pip` and `maven`.
*   **Python**: Just type `import pandas`. We automatically detect it, `pip install` it, and run your code.
*   **Java**: Just type `import com.google.gson.Gson`. We automatically fetch the JARs via Maven and add them to the classpath.
*   **JavaScript**: Automatic `npm install` bundling for your scripts.

### 3. 🗄️ Built-in Database Explorer
Connect to **MySQL**, **PostgreSQL**, and **MongoDB** directly from the sidebar. View tables, schema, and run SQL queries without leaving the IDE.

### 4. 🌐 Live Web Preview
Building a website? See your HTML/CSS/JS changes in real-time with the split-screen web preview.

### 5. 💻 Full-Featured Terminal
An integrated terminal that supports standard commands (`ls`, `cd`, `mkdir`, `touch`) and behaves like a real shell.

---

## 🛠️ Installation & Setup

### Prerequisites
*   **Node.js** (v18 or higher)
*   **Python** (3.10+) - *Required for Python execution*
*   **Java JDK** (17+) & **Maven** - *Required for Java execution*
*   **GCC/G++** - *Required for C/C++ execution*

### Step 1: Clone & Install
```bash
# Clone the repository
git clone https://github.com/your-repo/teachgrid-vs.git
cd teachgrid_vs

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
```

### Step 2: Configuration
Create a `.env` file in the `backend` folder (optional, defaults provided):
```ini
PORT=3001
FRONTEND_URL=http://localhost:3000
EXECUTION_MODE=local
```

### Step 3: Run the Application 🚀
We have a convenient start script for Windows:

```bash
# From the root directory (teachgrid_vs)
.\start_app.bat
```

This will automatically:
1.  Start the **Backend** server on port `3001`.
2.  Start the **Frontend** React app on port `3000`.
3.  Open your browser to the IDE.

---

## 📖 How to Use

### Running Python with Libraries
1.  Create a file named `analysis.py`.
2.  Type the following code:
    ```python
    import pandas as pd
    import numpy as np
    
    df = pd.DataFrame(np.random.randint(0,100,size=(10, 4)), columns=list('ABCD'))
    print(df)
    ```
3.  Click the **Run** ▶️ button.
4.  *First Run*: You will see "📦 Ensuring packages are installed...".
5.  *Result*: The dataframe prints to the terminal!

### Running Java with Libraries
1.  Create a file named `Main.java`.
2.  Type the following code:
    ```java
    import com.google.gson.Gson;
    import java.util.HashMap;
    
    public class Main {
        public static void main(String[] args) {
            HashMap<String, String> map = new HashMap<>();
            map.put("status", "working");
            System.out.println(new Gson().toJson(map));
        }
    }
    ```
3.  Click **Run** ▶️.
4.  The system automatically downloads the Gson library and runs your code.

### Connecting to a Database
1.  Click the **Database** icon in the Activity Bar (left).
2.  Click **"New Connection"**.
3.  Enter your connection string (e.g., `mysql://root:password@localhost:3306/testdb`).
4.  Browse tables and right-click to "Select Top 1000".

---

## 🏗️ Architecture

*   **Frontend**: React, Monaco Editor, Socket.IO Client.
*   **Backend**: Node.js, Express, Socket.IO Server.
*   **Execution**: Spawns isolated child processes for local execution.
*   **Storage**: Virtual file system (localStorage for browser persistence).

---

## 🤝 Contributing
1.  Fork the repository.
2.  Create a feature branch.
3.  Submit a Pull Request.

---

## 📄 License
MIT License - Free for educational use.
