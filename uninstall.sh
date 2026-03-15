#!/bin/bash

# OpenSpec Uninstaller v1.0.0

set -euo pipefail

SHARED_HOME="$HOME/.openspec"
MANIFEST_DIR="$SHARED_HOME/manifests"

PLATFORM=""
DRY_RUN=false

usage() {
    cat <<USAGE
Usage: ./uninstall.sh --platform <claude|codex|gemini> [--dry-run]
USAGE
}

run() {
    if [ "$DRY_RUN" = true ]; then
        echo "[dry-run] $*"
    else
        "$@"
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
    claude|codex|gemini) ;;
    *)
        echo "Error: unsupported platform '$PLATFORM'"
        usage
        exit 1
        ;;
esac

MANIFEST_FILE="$MANIFEST_DIR/$PLATFORM.manifest"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$SHARED_HOME/backups/uninstall-$PLATFORM-$TIMESTAMP"
BACKUP_READY=false
PROCESSED_PATHS="|"

ensure_backup_dir() {
    if [ "$DRY_RUN" = false ] && [ "$BACKUP_READY" = false ]; then
        mkdir -p "$BACKUP_DIR"
        BACKUP_READY=true
    fi
}

backup_and_remove_file() {
    local path="$1"
    case "$PROCESSED_PATHS" in
        *"|$path|"*) return ;;
    esac
    PROCESSED_PATHS="${PROCESSED_PATHS}${path}|"
    if [ -f "$path" ]; then
        if [ "$DRY_RUN" = false ]; then
            ensure_backup_dir
            mkdir -p "$BACKUP_DIR$(dirname "$path")"
            cp "$path" "$BACKUP_DIR$path"
        fi
        run "rm -f \"$path\""
        echo "Removed: $path"
    fi
}

cleanup_empty_chain() {
    local dir="$1"
    local platform_home="$HOME/.${PLATFORM}"
    while [ -n "$dir" ] && [ "$dir" != "/" ] && [ "$dir" != "$platform_home" ]; do
        run "rmdir \"$dir\" 2>/dev/null || true"
        dir="$(dirname "$dir")"
    done
}

echo "🗑️  OpenSpec v1.0.0 uninstaller"
echo "Platform: $PLATFORM"
[ "$DRY_RUN" = true ] && echo "Mode: dry-run"
echo

if [ -f "$MANIFEST_FILE" ]; then
    if [ "$DRY_RUN" = false ]; then
        ensure_backup_dir
        cp "$MANIFEST_FILE" "$BACKUP_DIR/"
    fi

    # Remove files listed in manifest.
    while IFS= read -r path; do
        [ -z "$path" ] && continue
        backup_and_remove_file "$path"
    done < "$MANIFEST_FILE"

    run "rm -f \"$MANIFEST_FILE\""
else
    echo "No manifest found for platform '$PLATFORM': $MANIFEST_FILE"
fi

# Codex legacy cleanup: remove old command-based installs.
if [ "$PLATFORM" = "codex" ]; then
    LEGACY_COMMANDS_DIR="$HOME/.codex/commands"
    LEGACY_OPSX_DIR="$LEGACY_COMMANDS_DIR/opsx"

    backup_and_remove_file "$LEGACY_COMMANDS_DIR/openspec.md"

    if [ -d "$LEGACY_OPSX_DIR" ]; then
        while IFS= read -r legacy_file; do
            backup_and_remove_file "$legacy_file"
        done < <(find "$LEGACY_OPSX_DIR" -type f -name '*.md' | sort)
    fi
    cleanup_empty_chain "$LEGACY_OPSX_DIR"
    cleanup_empty_chain "$LEGACY_COMMANDS_DIR"
fi

# Clean only OpenSpec-related empty directories.
PLATFORM_HOME="$HOME/.${PLATFORM}"
if [ "$PLATFORM" = "codex" ]; then
    cleanup_empty_chain "$PLATFORM_HOME/prompts"
    cleanup_empty_chain "$PLATFORM_HOME/skills/openspec-workflow"
    cleanup_empty_chain "$PLATFORM_HOME/skills"
else
    cleanup_empty_chain "$PLATFORM_HOME/commands/opsx"
    cleanup_empty_chain "$PLATFORM_HOME/commands"
    cleanup_empty_chain "$PLATFORM_HOME/skills/openspec-workflow"
    cleanup_empty_chain "$PLATFORM_HOME/skills"
fi

echo
echo "✅ Uninstall complete for platform '$PLATFORM'"
if [ "$DRY_RUN" = false ] && [ "$BACKUP_READY" = true ]; then
    echo "Backup dir: $BACKUP_DIR"
else
    echo "Backup dir: (none created)"
fi
