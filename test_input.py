import sys
import io

# Force utf-8 encoding for stdout and stderr to handle unicode characters on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def main():
    try:
        # Test printing a unicode character that was causing issues
        print("Running input test... \u26a0")
        name = input("Enter your name: ")
        print(f"Hello, {name}! Input received successfully.")
    except KeyboardInterrupt:
        print("\nProgram interrupted by user.")
        sys.exit(0)

if __name__ == "__main__":
    main()
