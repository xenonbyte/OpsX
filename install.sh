#!/bin/bash

# OpenSpec Installer v1.1.2
# Supports TOML for Gemini, Markdown for Claude and Codex

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SHARED_HOME="$HOME/.openspec"
SHARED_CONFIG="$SHARED_HOME/.opsx-config.yaml"
MANIFEST_DIR="$SHARED_HOME/manifests"

PLATFORMS=""
DRY_RUN=false

usage() {
    cat <<USAGE
Usage: ./install.sh --platform <claude|codex|gemini[,...]> [--dry-run]
USAGE
}

run() {
    if [ "$DRY_RUN" = true ]; then
        echo "[dry-run] $*"
    else
        eval "$*"
    fi
}

while [ $# -gt 0 ]; do
    case "$1" in
        --platform)
            PLATFORMS="${2:-}"
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

if [ -z "$PLATFORMS" ]; then
    echo "Error: --platform is required"
    usage
    exit 1
fi

IFS=',' read -ra ADDR <<< "$PLATFORMS"
for PLATFORM in "${ADDR[@]}"; do
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
    PLATFORM_SKILL_DIR="$PLATFORM_HOME/skills/openspec"
    SHARED_SKILL_DIR="$SHARED_HOME/skills/openspec"
    SHARED_COMMANDS_DIR="$SHARED_HOME/commands"
    SHARED_OPSX_DIR="$SHARED_COMMANDS_DIR/opsx"

    IS_CODEX=false
    IS_GEMINI=false
    IS_CLAUDE=false
    if [ "$PLATFORM" = "codex" ]; then
        IS_CODEX=true
    fi
    if [ "$PLATFORM" = "gemini" ]; then
        IS_GEMINI=true
    fi
    if [ "$PLATFORM" = "claude" ]; then
        IS_CLAUDE=true
    fi

    TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
    BACKUP_DIR="$SHARED_HOME/backups/install-$PLATFORM-$TIMESTAMP"
    MANIFEST_FILE="$MANIFEST_DIR/$PLATFORM.manifest"

    echo "🚀 OpenSpec v1.1.2 installer"
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

    # Backup existing platform files
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

    # Install shared bundle
    run "mkdir -p \"$SHARED_SKILL_DIR\" \"$SHARED_COMMANDS_DIR\""
    copy_md_dir "$SCRIPT_DIR/skills/openspec" "$SHARED_SKILL_DIR"
    copy_file "$SCRIPT_DIR/commands/openspec.md" "$SHARED_COMMANDS_DIR/openspec.md"

    # Install platform bundle
    if [ "$IS_CODEX" = true ]; then
        run "mkdir -p \"$PLATFORM_PROMPTS_DIR\" \"$PLATFORM_SKILL_DIR\""
    else
        run "mkdir -p \"$PLATFORM_OPSX_DIR\" \"$PLATFORM_SKILL_DIR\""
    fi

    # Cleanup old files
    cleanup_old_files() {
        local old_manifest="$1"
        if [ -f "$old_manifest" ]; then
            echo "Cleaning up old installation files..."
            while IFS= read -r old_path; do
                [ -z "$old_path" ] && continue
                if [ -f "$old_path" ]; then
                    case "$old_path" in
                        */commands/openspec.md|*/commands/openspec.toml|\
                        */commands/opsx/*.md|*/commands/opsx/*.toml|\
                        */prompts/openspec.md|*/prompts/openspec.toml|\
                        */prompts/opsx-*.md|*/prompts/opsx-*.toml|\
                        */skills/openspec/*)
                            run "rm -f \"$old_path\""
                            echo "  Removed: $old_path"
                            ;;
                    esac
                fi
            done < "$old_manifest"
        fi
    }

    OLD_MANIFEST_FILE="$MANIFEST_FILE.old"
    if [ "$DRY_RUN" = false ] && [ -f "$MANIFEST_FILE" ]; then
        cp "$MANIFEST_FILE" "$OLD_MANIFEST_FILE"
    fi

    if [ "$DRY_RUN" = false ]; then
        : > "$MANIFEST_FILE"
    fi

    if [ "$DRY_RUN" = false ] && [ -f "$OLD_MANIFEST_FILE" ]; then
        cleanup_old_files "$OLD_MANIFEST_FILE"
        rm -f "$OLD_MANIFEST_FILE"
    fi

    # Install commands based on platform
    if [ "$IS_CODEX" = true ]; then
        # Codex: Install .md prompts
        if [ -d "$SCRIPT_DIR/commands/codex/prompts" ]; then
            copy_md_dir "$SCRIPT_DIR/commands/codex/prompts" "$PLATFORM_PROMPTS_DIR"
        fi
    elif [ "$IS_GEMINI" = true ]; then
        # Gemini: Keep TOML
        if [ -d "$SCRIPT_DIR/commands/gemini/opsx" ]; then
            while IFS= read -r f; do
                rel="${f#$SCRIPT_DIR/commands/gemini/opsx/}"
                copy_file "$f" "$PLATFORM_OPSX_DIR/$rel"
            done < <(find "$SCRIPT_DIR/commands/gemini/opsx" -type f -name '*.toml' | sort)
            copy_file "$SCRIPT_DIR/commands/gemini/opsx.toml" "$PLATFORM_COMMANDS_DIR/opsx.toml"
        fi
    elif [ "$IS_CLAUDE" = true ]; then
        # Claude: Install .md commands
        if [ -d "$SCRIPT_DIR/commands/claude/opsx" ]; then
            copy_md_dir "$SCRIPT_DIR/commands/claude/opsx" "$PLATFORM_OPSX_DIR"
            copy_file "$SCRIPT_DIR/commands/claude/opsx.md" "$PLATFORM_COMMANDS_DIR/opsx.md"
        fi
    fi

    copy_md_dir "$SCRIPT_DIR/skills/openspec" "$PLATFORM_SKILL_DIR"

    # Migrate legacy config
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

version: \"1.1.2\"
platform: \"$PLATFORM\"  # claude | codex | gemini
language: \"$CURRENT_LANGUAGE\"      # en | zh
ruleFile: \"$RULE_FILE\"
CFG"

    echo
    echo "✅ Installation complete for platform '$PLATFORM'"
    echo "- Shared config: $SHARED_CONFIG"
    echo "- Platform manifest: $MANIFEST_FILE"
    echo "- Backup dir: $BACKUP_DIR"
    if [ "$IS_CODEX" = true ]; then
        echo "- Prompts: $PLATFORM_PROMPTS_DIR"
    else
        echo "- Commands: $PLATFORM_COMMANDS_DIR"
    fi
    echo "- Skill: $PLATFORM_SKILL_DIR"
    echo "------------------------------------------"
done
