// Command chrysalis-go is a thin entrypoint that runs the canonical Node CLI
// (packages/cli/dist/bin.js). Same flags and behavior; no duplicated pipeline logic.
package main

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

func relCli() string {
	return filepath.Join("packages", "cli", "dist", "bin.js")
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "[chrysalis-go] %v\n", err)
		os.Exit(2)
	}
}

func run() error {
	node, err := findNode()
	if err != nil {
		return err
	}
	js, err := findCliJs()
	if err != nil {
		return err
	}
	cmd := exec.Command(node, append([]string{js}, os.Args[1:]...)...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = os.Environ()
	err = cmd.Run()
	if err != nil {
		var ee *exec.ExitError
		if errors.As(err, &ee) {
			os.Exit(ee.ExitCode())
		}
		return err
	}
	return nil
}

func findNode() (string, error) {
	if v := os.Getenv("CHRYSALIS_NODE"); v != "" {
		return filepath.Clean(v), nil
	}
	p, err := exec.LookPath("node")
	if err != nil {
		return "", fmt.Errorf("node not found on PATH (install Node 20+ or set CHRYSALIS_NODE): %w", err)
	}
	return p, nil
}

func findCliJs() (string, error) {
	if v := os.Getenv("CHRYSALIS_CLI_JS"); v != "" {
		abs, err := filepath.Abs(v)
		if err != nil {
			return "", err
		}
		if st, err := os.Stat(abs); err != nil || st.IsDir() {
			return "", fmt.Errorf("CHRYSALIS_CLI_JS is not a file: %s", abs)
		}
		return abs, nil
	}
	rel := relCli()
	if p, ok := findUpwards(os.Getwd, rel); ok {
		return p, nil
	}
	exe, err := os.Executable()
	if err == nil {
		exeDir := filepath.Dir(exe)
		if p, ok := findUpwards(func() (string, error) { return exeDir, nil }, rel); ok {
			return p, nil
		}
	}
	return "", fmt.Errorf(
		"could not find %s; run `pnpm --filter @chrysalis/cli build` from the repo root or set CHRYSALIS_CLI_JS to an absolute path",
		rel,
	)
}

func findUpwards(getStart func() (string, error), rel string) (string, bool) {
	start, err := getStart()
	if err != nil {
		return "", false
	}
	dir := filepath.Clean(start)
	for {
		candidate := filepath.Join(dir, rel)
		if st, err := os.Stat(candidate); err == nil && !st.IsDir() {
			return candidate, true
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return "", false
}
