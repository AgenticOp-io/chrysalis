"""Allow `python -m chrysalis_shim` when the package is on PYTHONPATH."""

from chrysalis_shim.cli import main

if __name__ == "__main__":
    main()
