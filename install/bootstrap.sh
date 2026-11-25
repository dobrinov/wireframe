#!/bin/sh
# Gets a computer ready for /wireframe without needing anything pre-installed.
# - Uses Node.js if a recent one (18+) is already there.
# - Otherwise downloads a private copy of Node.js into ~/.wireframe/runtime
#   (no admin rights, nothing else on the computer changes).
# - Then runs `wf setup`, which creates ~/Wireframes and the `wf` command.
set -eu

KIT="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME="$HOME/.wireframe/runtime"
FALLBACK_VERSION="v24.11.1"

say() { printf '%s\n' "$*"; }

node_ok() {
  "$1" -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)' 2>/dev/null
}

NODE=""
if command -v node >/dev/null 2>&1 && node_ok node; then
  NODE="$(command -v node)"
  say "✓ Using the Node.js already on this computer ($("$NODE" -v))."
elif [ -x "$RUNTIME/bin/node" ] && node_ok "$RUNTIME/bin/node"; then
  NODE="$RUNTIME/bin/node"
  say "✓ Using the private runtime in $RUNTIME."
else
  case "$(uname -s)" in
    Darwin) OS=darwin ;;
    Linux) OS=linux ;;
    *) say "This installer supports Mac and Linux. On Windows, run install/bootstrap.ps1."; exit 1 ;;
  esac
  case "$(uname -m)" in
    arm64|aarch64) ARCH=arm64 ;;
    x86_64|amd64) ARCH=x64 ;;
    *) say "Unsupported processor: $(uname -m)"; exit 1 ;;
  esac
  VERSION="$(curl -fsSL https://nodejs.org/dist/index.json 2>/dev/null | tr '{' '\n' | grep '"lts":"' | head -1 | sed 's/.*"version":"\([^"]*\)".*/\1/' || true)"
  [ -n "$VERSION" ] || VERSION="$FALLBACK_VERSION"
  NAME="node-$VERSION-$OS-$ARCH"
  say "Downloading a private Node.js runtime ($VERSION, about 50 MB)…"
  TMP="$(mktemp -d)"
  curl -fL --progress-bar "https://nodejs.org/dist/$VERSION/$NAME.tar.gz" -o "$TMP/node.tar.gz"
  curl -fsSL "https://nodejs.org/dist/$VERSION/SHASUMS256.txt" -o "$TMP/SHASUMS256.txt"
  EXPECTED="$(grep " $NAME.tar.gz\$" "$TMP/SHASUMS256.txt" | cut -d' ' -f1)"
  if command -v shasum >/dev/null 2>&1; then ACTUAL="$(shasum -a 256 "$TMP/node.tar.gz" | cut -d' ' -f1)"; else ACTUAL="$(sha256sum "$TMP/node.tar.gz" | cut -d' ' -f1)"; fi
  if [ -z "$EXPECTED" ] || [ "$EXPECTED" != "$ACTUAL" ]; then say "The download did not match its checksum; stopping."; rm -rf "$TMP"; exit 1; fi
  mkdir -p "$TMP/x"
  tar -xzf "$TMP/node.tar.gz" -C "$TMP/x"
  rm -rf "$RUNTIME"
  mkdir -p "$(dirname "$RUNTIME")"
  mv "$TMP/x/$NAME" "$RUNTIME"
  rm -rf "$TMP"
  NODE="$RUNTIME/bin/node"
  say "✓ Runtime installed in $RUNTIME."
fi

"$NODE" "$KIT/bin/wf.js" setup
