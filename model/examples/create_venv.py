import os
import subprocess
import sys

# Function to create and activate a virtual environment
def create_virtualenv(venv_name):
    if not os.path.exists(venv_name):
        subprocess.check_call([sys.executable, "-m", "venv", venv_name])
    activate_script = os.path.join(venv_name, "Scripts" if os.name == "nt" else "bin", "activate_this.py")
    
    # Properly activate the virtual environment
    exec(open(activate_script).read(), {'__file__': activate_script})

# Function to install dependencies
def install_dependencies(venv_name, requirements_file):
    pip_path = os.path.join(venv_name, "Scripts" if os.name == "nt" else "bin", "pip")
    subprocess.check_call([pip_path, "install", "-r", requirements_file])

# Create and activate the virtual environment
venv_name = "blackjack_venv"
create_virtualenv(venv_name)

# Install dependencies
requirements_file = "venv_requirements.txt"
install_dependencies(venv_name, requirements_file)
