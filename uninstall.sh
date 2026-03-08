#!/bin/bash

# OpenSpec Skill Package Uninstaller v2.0.0

set -euo pipefail

SHARED_HOME="$HOME/.openspec"
MANIFEST_DIR="$SHARED_HOME/manifests"

PLATFORM=""
DRY_RUN=false

usage() {
    cat <<USAGE
Usage: ./uninstall.sh --platform <claude|codex|opencode|gemini|openclaw> [--dry-run]
USAGE
}

run() {
    if [ "$DRY_RUN" = true ]; then
        echo "[dry-run] $*"
    else
        eval "$@"
    fi
}

while [ $# -gt 0 ]; do
    case "$1" in
        --platform)
            PLATFORM="${2:-}"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown argument: $1"
            usage
            exit 1
            ;;
    esac
done

if [ -z "$PLATFORM" ]; then
    echo "Error: --platform is required"
    usage
    exit 1
fi

case "$PLATFORM" in
    claude|codex|opencode|gemini|openclaw) ;;
    *)
        echo "Error: unsupported platform '$PLATFORM'"
        usage
        exit 1
        ;;
esac

MANIFEST_FILE="$MANIFEST_DIR/$PLATFORM.manifest"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$SHARED_HOME/backups/uninstall-$PLATFORM-$TIMESTAMP"

echo "🗑️  OpenSpec Skill Package Uninstaller v2.0.0"
echo "Platform: $PLATFORM"
[ "$DRY_RUN" = true ] && echo "Mode: dry-run"
echo

if [ ! -f "$MANIFEST_FILE" ]; then
    echo "No manifest found for platform '$PLATFORM': $MANIFEST_FILE"
    echo "Nothing to uninstall."
    exit 0
fi

if [ "$DRY_RUN" = false ]; then
    mkdir -p "$BACKUP_DIR"
    cp "$MANIFEST_FILE" "$BACKUP_DIR/"
fi

# Remove files listed in manifest.
while IFS= read -r path; do
    [ -z "$path" ] && continue
    if [ -f "$path" ]; then
        if [ "$DRY_RUN" = false ]; then
            mkdir -p "$BACKUP_DIR$(dirname "$path")"
            cp "$path" "$BACKUP_DIR$path"
        fi
        run "rm -f \"$path\""
        echo "Removed: $path"
    fi
done < "$MANIFEST_FILE"

# Clean empty directories under platform root.
PLATFORM_HOME="$HOME/.${PLATFORM}"
if [ -d "$PLATFORM_HOME" ]; then
    while IFS= read -r dir; do
        [ -z "$dir" ] && continue
        run "rmdir \"$dir\" 2>/dev/null || true"
    done < <(find "$PLATFORM_HOME" -type d | awk '{ print length, $0 }' | sort -rn | cut -d' ' -f2-)
fi

run "rm -f \"$MANIFEST_FILE\""

echo
echo "✅ Uninstall complete for platform '$PLATFORM'"
echo "Backup dir: $BACKUP_DIR"
