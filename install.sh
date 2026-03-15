#!/bin/bash

# OpenSpec Installer v1.0.0

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SHARED_HOME="$HOME/.openspec"
SHARED_CONFIG="$SHARED_HOME/.opsx-config.yaml"
MANIFEST_DIR="$SHARED_HOME/manifests"

PLATFORM=""
DRY_RUN=false

usage() {
    cat <<USAGE
Usage: ./install.sh --platform <claude|codex|gemini> [--dry-run]
USAGE
}

run() {
    if [ "$DRY_RUN" = true ]; then
        echo "[dry-run] $*"
    else
        # Commands are passed as a single quoted string at call sites.
        # Evaluate that string so normal mode matches dry-run behavior.
        eval "$*"
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
    claude) RULE_FILE="CLAUDE.md" ;;
    codex) RULE_FILE="AGENTS.md" ;;
    gemini) RULE_FILE="GEMINI.md" ;;
    *)
        echo "Error: unsupported platform '$PLATFORM'"
        usage
        exit 1
        ;;
esac

PLATFORM_HOME="$HOME/.${PLATFORM}"
PLATFORM_COMMANDS_DIR="$PLATFORM_HOME/commands"
PLATFORM_OPSX_DIR="$PLATFORM_COMMANDS_DIR/opsx"
PLATFORM_PROMPTS_DIR="$PLATFORM_HOME/prompts"
PLATFORM_SKILL_DIR="$PLATFORM_HOME/skills/openspec-workflow"
SHARED_SKILL_DIR="$SHARED_HOME/skills/openspec-workflow"
SHARED_COMMANDS_DIR="$SHARED_HOME/commands"
SHARED_OPSX_DIR="$SHARED_COMMANDS_DIR/opsx"
IS_CODEX=false
if [ "$PLATFORM" = "codex" ]; then
    IS_CODEX=true
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$SHARED_HOME/backups/install-$PLATFORM-$TIMESTAMP"
MANIFEST_FILE="$MANIFEST_DIR/$PLATFORM.manifest"

echo "🚀 OpenSpec v1.0.0 installer"
echo "Platform: $PLATFORM"
echo "Rule file: $RULE_FILE"
[ "$DRY_RUN" = true ] && echo "Mode: dry-run"
echo

run "mkdir -p \"$SHARED_HOME\" \"$MANIFEST_DIR\""

record_manifest() {
    if [ "$DRY_RUN" = false ]; then
        echo "$1" >> "$MANIFEST_FILE"
    fi
}

copy_file() {
    local src="$1"
    local dst="$2"
    run "mkdir -p \"$(dirname "$dst")\""
    run "cp \"$src\" \"$dst\""
    record_manifest "$dst"
}

copy_md_dir() {
    local src_dir="$1"
    local dst_dir="$2"
    local f
    while IFS= read -r f; do
        local rel="${f#${src_dir}/}"
        copy_file "$f" "$dst_dir/$rel"
    done < <(find "$src_dir" -type f -name '*.md' | sort)
}

copy_codex_prompt_file() {
    local src="$1"
    local dst="$2"
    run "mkdir -p \"$(dirname "$dst")\""
    run "perl -pe 's{(?<![A-Za-z0-9._-])/opsx:\\*}{/prompts:opsx-*}g; s{(?<![A-Za-z0-9._-])/opsx:([A-Za-z0-9-]+)}{/prompts:opsx-\$1}g; s{(?<![A-Za-z0-9._-])/openspec(?![A-Za-z0-9_-])}{/prompts:openspec}g' \"$src\" > \"$dst\""
    record_manifest "$dst"
}

copy_opsx_as_codex_prompts() {
    local src_dir="$1"
    local dst_dir="$2"
    local f
    local base
    while IFS= read -r f; do
        base="$(basename "$f" .md)"
        copy_codex_prompt_file "$f" "$dst_dir/opsx-${base}.md"
    done < <(find "$src_dir" -type f -name '*.md' | sort)
}

# Backup existing platform files only.
if [ "$DRY_RUN" = false ]; then
    mkdir -p "$BACKUP_DIR"
    if [ "$IS_CODEX" = true ]; then
        [ -d "$PLATFORM_PROMPTS_DIR" ] && cp -r "$PLATFORM_PROMPTS_DIR" "$BACKUP_DIR/" || true
        [ -d "$PLATFORM_COMMANDS_DIR" ] && cp -r "$PLATFORM_COMMANDS_DIR" "$BACKUP_DIR/" || true
    else
        [ -d "$PLATFORM_COMMANDS_DIR" ] && cp -r "$PLATFORM_COMMANDS_DIR" "$BACKUP_DIR/" || true
    fi
    [ -d "$PLATFORM_SKILL_DIR" ] && cp -r "$PLATFORM_SKILL_DIR" "$BACKUP_DIR/" || true
fi

# Install shared bundle used by /openspec --doc and shared config.
run "mkdir -p \"$SHARED_SKILL_DIR\" \"$SHARED_OPSX_DIR\""
copy_md_dir "$SCRIPT_DIR/skills/openspec-workflow" "$SHARED_SKILL_DIR"
copy_md_dir "$SCRIPT_DIR/commands/opsx" "$SHARED_OPSX_DIR"
copy_file "$SCRIPT_DIR/commands/openspec.md" "$SHARED_COMMANDS_DIR/openspec.md"

# Install platform bundle.
if [ "$IS_CODEX" = true ]; then
    run "mkdir -p \"$PLATFORM_PROMPTS_DIR\" \"$PLATFORM_SKILL_DIR\""
else
    run "mkdir -p \"$PLATFORM_OPSX_DIR\" \"$PLATFORM_SKILL_DIR\""
fi

# Clean up old files before installing new ones.
# Read old manifest and remove files that won't be in the new install.
cleanup_old_files() {
    local old_manifest="$1"
    if [ -f "$old_manifest" ]; then
        echo "Cleaning up old installation files..."
        while IFS= read -r old_path; do
            [ -z "$old_path" ] && continue
            if [ -f "$old_path" ]; then
                # Only remove if it's an OpenSpec-managed path
                case "$old_path" in
                    */commands/openspec.md|*/commands/opsx/*|*/prompts/openspec.md|*/prompts/opsx-*.md|*/skills/openspec-workflow/*)
                        run "rm -f \"$old_path\""
                        echo "  Removed: $old_path"
                        ;;
                esac
            fi
        done < "$old_manifest"
    fi
}

# Store old manifest before reset for cleanup.
OLD_MANIFEST_FILE="$MANIFEST_FILE.old"
if [ "$DRY_RUN" = false ] && [ -f "$MANIFEST_FILE" ]; then
    cp "$MANIFEST_FILE" "$OLD_MANIFEST_FILE"
fi

# Reset manifest for this platform on each install.
if [ "$DRY_RUN" = false ]; then
    : > "$MANIFEST_FILE"
fi

# Clean up old files from previous installation.
if [ "$DRY_RUN" = false ] && [ -f "$OLD_MANIFEST_FILE" ]; then
    cleanup_old_files "$OLD_MANIFEST_FILE"
    rm -f "$OLD_MANIFEST_FILE"
fi

if [ "$IS_CODEX" = true ]; then
    copy_opsx_as_codex_prompts "$SCRIPT_DIR/commands/opsx" "$PLATFORM_PROMPTS_DIR"
    copy_codex_prompt_file "$SCRIPT_DIR/commands/openspec.md" "$PLATFORM_PROMPTS_DIR/openspec.md"
else
    copy_md_dir "$SCRIPT_DIR/commands/opsx" "$PLATFORM_OPSX_DIR"
    copy_file "$SCRIPT_DIR/commands/openspec.md" "$PLATFORM_COMMANDS_DIR/openspec.md"
fi
copy_md_dir "$SCRIPT_DIR/skills/openspec-workflow" "$PLATFORM_SKILL_DIR"

# Migrate legacy Claude-only config if needed.
if [ "$DRY_RUN" = false ] && [ ! -f "$SHARED_CONFIG" ] && [ -f "$HOME/.claude/.opsx-config.yaml" ]; then
    cp "$HOME/.claude/.opsx-config.yaml" "$BACKUP_DIR/legacy-claude-config.yaml"
fi

CURRENT_LANGUAGE="en"
if [ -f "$SHARED_CONFIG" ]; then
    CURRENT_LANGUAGE="$(grep -E '^[[:space:]]*language:' "$SHARED_CONFIG" | head -n1 | sed -E 's/^[[:space:]]*language:[[:space:]]*"?([^"[:space:]#]+)"?.*$/\1/')"
fi
if [ -z "$CURRENT_LANGUAGE" ]; then
    CURRENT_LANGUAGE="en"
fi

run "cat > \"$SHARED_CONFIG\" <<CFG
# OpenSpec Local Skill Configuration
# Managed by /openspec meta-commands

version: \"1.0.0\"
platform: \"$PLATFORM\"  # claude | codex | gemini
language: \"$CURRENT_LANGUAGE\"      # en | zh
ruleFile: \"$RULE_FILE\"
CFG"

echo
echo "✅ Installation complete"
echo "- Shared config: $SHARED_CONFIG"
echo "- Platform manifest: $MANIFEST_FILE"
echo "- Backup dir: $BACKUP_DIR"
if [ "$IS_CODEX" = true ]; then
    echo "- Prompts: $PLATFORM_PROMPTS_DIR"
else
    echo "- Commands: $PLATFORM_COMMANDS_DIR"
fi
echo "- Skill: $PLATFORM_SKILL_DIR"
echo
echo "📌 Next step: Run the guided tutorial to get started!"
if [ "$IS_CODEX" = true ]; then
    echo "   → Execute: /prompts:opsx-onboard"
else
    echo "   → Execute: /opsx:onboard"
fi
