/**
 * Detects npm packages required in user code
 * Filters out built-in Node.js modules
 */

const BUILTIN_MODULES = new Set([
    'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns',
    'domain', 'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'punycode',
    'querystring', 'readline', 'stream', 'string_decoder', 'timers', 'tls',
    'tty', 'url', 'util', 'v8', 'vm', 'zlib', 'process', 'console'
]);

// python built-ins
const PYTHON_BUILTINS = new Set([
    'abc', 'aifc', 'argparse', 'array', 'ast', 'asynchat', 'asyncio', 'asyncore',
    'atexit', 'audioop', 'base64', 'bdb', 'binascii', 'binhex', 'bisect', 'builtins',
    'bz2', 'calendar', 'cgi', 'cgitb', 'chunk', 'cmath', 'cmd', 'code', 'codecs',
    'codeop', 'collections', 'colorsys', 'compileall', 'concurrent', 'configparser',
    'contextlib', 'contextvars', 'copy', 'copyreg', 'cProfile', 'crypt', 'csv',
    'ctypes', 'curses', 'dataclasses', 'datetime', 'dbm', 'decimal', 'difflib',
    'dis', 'distutils', 'doctest', 'dummy_threading', 'email', 'encodings', 'ensurepip',
    'enum', 'errno', 'faulthandler', 'fcntl', 'filecmp', 'fileinput', 'fnmatch',
    'formatter', 'fractions', 'ftplib', 'functools', 'gc', 'getopt', 'getpass',
    'gettext', 'glob', 'graphlib', 'grp', 'gzip', 'hashlib', 'heapq', 'hmac',
    'html', 'http', 'imaplib', 'imghdr', 'imp', 'importlib', 'inspect', 'io',
    'ipaddress', 'itertools', 'json', 'keyword', 'lib2to3', 'linecache', 'locale',
    'logging', 'lzma', 'mailbox', 'mailcap', 'marshal', 'math', 'mimetypes',
    'mmap', 'modulefinder', 'msilib', 'msvcrt', 'multiprocessing', 'netrc',
    'nntplib', 'numbers', 'operator', 'optparse', 'os', 'ossaudiodev', 'parser',
    'pathlib', 'pdb', 'pickle', 'pickletools', 'pipes', 'pkgutil', 'platform',
    'plistlib', 'poplib', 'posix', 'pprint', 'profile', 'pstats', 'pty', 'pwd',
    'py_compile', 'pyclbr', 'pydoc', 'queue', 'quopri', 'random', 're', 'readline',
    'reprlib', 'resource', 'rlcompleter', 'runpy', 'sched', 'secrets', 'select',
    'selectors', 'shelve', 'shlex', 'shutil', 'signal', 'site', 'smtpd', 'smtplib',
    'sndhdr', 'socket', 'socketserver', 'spwd', 'sqlite3', 'ssl', 'stat', 'statistics',
    'string', 'stringprep', 'struct', 'subprocess', 'sunau', 'symbol', 'symtable',
    'sys', 'sysconfig', 'syslog', 'tabnanny', 'tarfile', 'telnetlib', 'tempfile',
    'termios', 'textwrap', 'threading', 'time', 'timeit', 'tkinter', 'token',
    'tokenize', 'trace', 'traceback', 'tracemalloc', 'tty', 'turtle', 'turtledemo',
    'types', 'typing', 'unicodedata', 'unittest', 'urllib', 'uu', 'uuid', 'venv',
    'warnings', 'wave', 'weakref', 'webbrowser', 'winreg', 'winsound', 'wsgiref',
    'xdrlib', 'xml', 'xmlrpc', 'zipapp', 'zipfile', 'zipimport', 'zlib', 'zoneinfo'
]);

// Java built-ins
const JAVA_BUILTINS = new Set([
    'java', 'javax', 'sun', 'jdk', 'org.w3c', 'org.xml'
]);

export function detectPackages(code, language = 'javascript') {
    const packages = new Set();

    if (language === 'javascript') {
        detectNodePackages(code, packages);
    } else if (language === 'python') {
        detectPythonPackages(code, packages);
    } else if (language === 'java') {
        detectJavaPackages(code, packages);
    }

    return Array.from(packages);
}

function detectNodePackages(code, packages) {
    // ... existing javascript detection ...
    // Match require('package') and require("package")
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match;

    while ((match = requireRegex.exec(code)) !== null) {
        const moduleName = match[1];

        // Skip relative/absolute paths
        if (moduleName.startsWith('.') || moduleName.startsWith('/')) {
            continue;
        }

        // Skip built-in modules
        if (BUILTIN_MODULES.has(moduleName)) {
            continue;
        }

        // Handle scoped packages (@org/package) and sub-paths (package/subpath)
        const packageName = moduleName.startsWith('@')
            ? moduleName.split('/').slice(0, 2).join('/')
            : moduleName.split('/')[0];

        packages.add(packageName);
    }
}

function detectJavaPackages(code, packages) {
    // import com.example.MyClass;
    const importRegex = /^\s*import\s+([a-zA-Z0-9_.]+);/gm;
    let match;

    while ((match = importRegex.exec(code)) !== null) {
        // e.g. java.util.List -> java.util.List
        // e.g. org.springframework.boot.SpringApplication -> org.springframework.boot.SpringApplication
        const fullClass = match[1];

        // We generally need the prefix to identify the library
        // e.g. org.springframework.boot
        const pkgParts = fullClass.split('.');
        const domain = pkgParts[0];

        if (JAVA_BUILTINS.has(domain) || fullClass.startsWith('java.') || fullClass.startsWith('javax.')) {
            continue;
        }

        packages.add(fullClass);
    }
}

function detectPythonPackages(code, packages) {
    // 1. import x
    // 2. from x import y
    // 3. import x.y

    // Regular expressions for Python imports
    const importRegex = /^import\s+([a-zA-Z0-9_]+)/gm;
    const fromImportRegex = /^from\s+([a-zA-Z0-9_]+)/gm;

    let match;

    while ((match = importRegex.exec(code)) !== null) {
        const pkg = match[1];
        if (!PYTHON_BUILTINS.has(pkg)) {
            packages.add(pkg);
        }
    }

    while ((match = fromImportRegex.exec(code)) !== null) {
        const pkg = match[1];
        if (!PYTHON_BUILTINS.has(pkg)) {
            packages.add(pkg);
        }
    }
}
