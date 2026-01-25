# TeachGrid Backend ⚡

The robust execution engine for the TeachGrid IDE. It handles code compilation, database connectivity, and **Smart Dependency Management**.

## 🚀 Key Features

*   **Multi-Language Support**: Run Python, Java, C++, Node.js, and more.
*   **Smart Package Manager** (New!):
    *   **Python**: Auto-installs libraries (`pip install`) seamlessly.
    *   **Java**: Auto-resolves Maven dependencies (`mvn dependency:copy`).
    *   **JavaScript**: Bundles `npm` packages on the fly.
*   **Database API**: Unified interface for MySQL, PostgreSQL, and MongoDB.
*   **WebSockets**: Real-time I/O streaming to the frontend terminal.

## 🛠️ Installation

```bash
cd backend
npm install
```

## ⚙️ Configuration

Create a `.env` file in the `backend` directory:

```ini
PORT=3001
FRONTEND_URL=http://localhost:3000
EXECUTION_MODE=local
# EXECUTION_MODE=piston  <-- Use this if you want to use the Piston API instead of local runtimes
```

## 🏃‍♂️ How to Run

### Development Mode (Auto-restart)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## 📦 Dependency Cache
Downloaded libraries are stored persistently in:
*   `backend/user_libs/python` (Python packages)
*   `backend/user_libs/java` (Java JARs)

You can manually clean these folders if you need to reclaim disk space.
