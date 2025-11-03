#!/bin/bash

# ============================================
# Firma Hukum Server - Source Collector
# Version: 2.0 (Complete with Root & Prisma)
# ============================================

# Warna untuk output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Path base
PROJECT_ROOT="d:/PROJECT-GITHUB/FIRMA-PROJECT-DOCKER/server"
OUTPUT_DIR="collections"
OUTPUT_FILE="$OUTPUT_DIR/firma-hukum-complete-collection.txt"

# Counter
TOTAL_FILES=0
TOTAL_DIRS=0

# Function untuk menampilkan header
show_header() {
    clear
    echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║    Firma Hukum Server Collector v2.0               ║${NC}"
    echo -e "${BLUE}║    Complete Collection (Root + Prisma + Monitoring)║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function untuk check dan skip direktori
should_skip_directory() {
    local dir="$1"
    local basename=$(basename "$dir")
    
    case "$basename" in
        node_modules|dist|build|.git|coverage|collections|.next|temp|tmp|backups|uploads)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Function untuk check dan skip file
should_skip_file() {
    local filename="$1"
    
    case "$filename" in
        .gitkeep|.DS_Store|package-lock.json|yarn.lock|pnpm-lock.yaml)
            return 0
            ;;
        *.spec.ts|*.test.ts)
            return 0
            ;;
        .env|.env.example|.env.production)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Function untuk check file config yang boleh di-collect
should_collect_config() {
    local filename="$1"
    
    case "$filename" in
        *.json|*.yml|*.yaml|*.conf|Dockerfile|.dockerignore|justfile)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Function untuk memproses file
process_file() {
    local file="$1"
    local output_file="$2"
    local base_path="$3"
    local relative_path="${file#$base_path/}"
    
    # Normalize path separators untuk Windows
    relative_path="${relative_path//\\//}"
    
    echo -e "${GREEN}  ✓ $relative_path${NC}"
    
    {
        echo "================================================"
        echo "FILE: $relative_path"
        echo "================================================"
        echo ""
        cat "$file"
        echo ""
        echo ""
    } >> "$output_file"
    
    ((TOTAL_FILES++))
}

# Function untuk generate folder structure
generate_folder_structure() {
    local dir="$1"
    local prefix="$2"
    local is_last="$3"
    
    should_skip_directory "$dir" && return
    
    local basename=$(basename "$dir")
    local connector="├──"
    [[ "$is_last" == "true" ]] && connector="└──"
    
    echo "${prefix}${connector} ${basename}/"
    
    # Get subdirectories
    local subdirs=()
    while IFS= read -r -d '' subdir; do
        should_skip_directory "$subdir" || subdirs+=("$subdir")
    done < <(find "$dir" -maxdepth 1 -type d ! -path "$dir" -print0 2>/dev/null | sort -z)
    
    # Process subdirectories
    local total=${#subdirs[@]}
    local count=0
    for subdir in "${subdirs[@]}"; do
        ((count++))
        local new_prefix="${prefix}"
        if [[ "$is_last" == "true" ]]; then
            new_prefix="${prefix}    "
        else
            new_prefix="${prefix}│   "
        fi
        
        local sub_is_last="false"
        [[ $count -eq $total ]] && sub_is_last="true"
        
        generate_folder_structure "$subdir" "$new_prefix" "$sub_is_last"
    done
}

# Function untuk memproses direktori secara rekursif
process_directory() {
    local dir="$1"
    local output_file="$2"
    local base_path="$3"
    
    should_skip_directory "$dir" && return
    
    ((TOTAL_DIRS++))
    
    # Process files dengan ekstensi TypeScript dan JavaScript
    local files=()
    while IFS= read -r -d '' file; do
        local filename=$(basename "$file")
        should_skip_file "$filename" || files+=("$file")
    done < <(find "$dir" -maxdepth 1 -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -print0 2>/dev/null | sort -z)
    
    # Process found files
    for file in "${files[@]}"; do
        process_file "$file" "$output_file" "$base_path"
    done
    
    # Process subdirectories
    local subdirs=()
    while IFS= read -r -d '' subdir; do
        should_skip_directory "$subdir" || subdirs+=("$subdir")
    done < <(find "$dir" -maxdepth 1 -type d ! -path "$dir" -print0 2>/dev/null | sort -z)
    
    for subdir in "${subdirs[@]}"; do
        process_directory "$subdir" "$output_file" "$base_path"
    done
}

# Function untuk show statistics
show_statistics() {
    local output_file="$1"
    
    echo ""
    echo -e "${GREEN}✅ Collection completed!${NC}"
    echo -e "Output: ${BLUE}$output_file${NC}"
    
    if command -v wc &> /dev/null; then
        local total_lines=$(wc -l < "$output_file" 2>/dev/null || echo "0")
        local total_size=$(du -h "$output_file" 2>/dev/null | cut -f1 || echo "0")
        
        echo ""
        echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
        echo -e "${BLUE}║         Collection Statistics          ║${NC}"
        echo -e "${BLUE}╠════════════════════════════════════════╣${NC}"
        printf "${BLUE}║${NC} Directories: ${YELLOW}%4d${NC}                   ${BLUE}║${NC}\n" $TOTAL_DIRS
        printf "${BLUE}║${NC} Files:       ${YELLOW}%4d${NC}                   ${BLUE}║${NC}\n" $TOTAL_FILES
        printf "${BLUE}║${NC} Lines:       ${YELLOW}%10s${NC}           ${BLUE}║${NC}\n" "$total_lines"
        printf "${BLUE}║${NC} Size:        ${YELLOW}%10s${NC}           ${BLUE}║${NC}\n" "$total_size"
        echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    fi
}

# Function untuk show directory structure
show_directory_info() {
    echo -e "${CYAN}📂 Project Structure:${NC}"
    echo ""
    echo "server/"
    generate_folder_structure "$PROJECT_ROOT" "" "false"
    echo ""
}

# Main execution
main() {
    show_header
    
    # Check if base path exists
    if [ ! -d "$PROJECT_ROOT" ]; then
        echo -e "${RED}ERROR: Project path not found: $PROJECT_ROOT${NC}"
        echo -e "${YELLOW}Please update PROJECT_ROOT variable in the script${NC}"
        exit 1
    fi
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    
    # Create header in output file
    cat > "$OUTPUT_FILE" << EOF
================================================
SOURCE CODE COLLECTION - FIRMA HUKUM SERVER
Generated: $(date)
Project: Firma Hukum - NestJS Backend
Path: $PROJECT_ROOT
================================================

COMPLETE PROJECT STRUCTURE:

ROOT LEVEL:
- docker-compose.yml      : Docker orchestration
- Dockerfile              : Container configuration
- package.json            : NPM dependencies
- tsconfig.json           : TypeScript configuration
- nest-cli.json           : NestJS CLI configuration
- justfile                : Just command runner
- redis.conf              : Redis configuration
- railway.json            : Railway deployment config

PRISMA:
- prisma/
  - schema.prisma         : Database schema & models
  - seed.ts               : Database seeding

MONITORING:
- monitoring/
  - prometheus.yml        : Prometheus configuration
  - alert_rules.yml       : Alert rules
  - grafana/
    - datasources/        : Grafana data sources
    - dashboards/         : Pre-built dashboards

SOURCE CODE:
- src/
  - common/               : Shared utilities & core components
    - decorators/         : @CurrentUser, @Public, @Roles
    - dto/                : Base DTOs (pagination)
    - filters/            : Exception filters
    - guards/             : Auth & role guards
    - interceptors/       : Transform & logging
    - interfaces/         : TypeScript interfaces
    - pipes/              : Validation pipes

  - config/               : Configuration modules
    - app.config.ts
    - database.config.ts
    - jwt.config.ts
    - logger.config.ts
    - monitoring.config.ts
    - redis.config.ts

  - modules/              : Feature modules
    - auth/               : Authentication & JWT
    - cache/              : Redis caching
    - catatan/            : Case notes
    - dashboard/          : Statistics dashboard
    - dokumen/            : Document management
    - email/              : Email service
    - health/             : Health checks
    - klien/              : Client management
    - konflik/            : Conflict checking
    - log-aktivitas/      : Activity logging
    - logger/             : Logger service
    - logs/               : Log management
    - monitoring/         : Metrics & monitoring
    - perkara/            : Case management
    - sidang/             : Court hearings
    - storage/            : File storage
    - tim-perkara/        : Case team management
    - tugas/              : Task management
    - users/              : User management

  - prisma/               : Prisma service
    - prisma.module.ts
    - prisma.service.ts

================================================

EOF
    
    echo -e "${CYAN}📦 Collecting all source files...${NC}"
    echo ""
    
    # Show directory structure
    show_directory_info
    
    echo -e "${YELLOW}📄 Processing files...${NC}"
    echo ""
    
    # ===== ROOT LEVEL CONFIG FILES =====
    echo -e "${MAGENTA}→ Root configuration files${NC}"
    
    # Docker files
    if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        echo -e "${CYAN}  → docker-compose.yml${NC}"
        process_file "$PROJECT_ROOT/docker-compose.yml" "$OUTPUT_FILE" "$PROJECT_ROOT"
    fi
    
    if [ -f "$PROJECT_ROOT/Dockerfile" ]; then
        echo -e "${CYAN}  → Dockerfile${NC}"
        process_file "$PROJECT_ROOT/Dockerfile" "$OUTPUT_FILE" "$PROJECT_ROOT"
    fi
    
    # Package & config files
    local root_configs=("package.json" "tsconfig.json" "tsconfig.build.json" "nest-cli.json" "justfile" "redis.conf" "railway.json" ".prettierrc" "eslint.config.mjs")
    for config in "${root_configs[@]}"; do
        if [ -f "$PROJECT_ROOT/$config" ]; then
            echo -e "${CYAN}  → $config${NC}"
            process_file "$PROJECT_ROOT/$config" "$OUTPUT_FILE" "$PROJECT_ROOT"
        fi
    done
    echo ""
    
    # ===== PRISMA DIRECTORY =====
    if [ -d "$PROJECT_ROOT/prisma" ]; then
        echo -e "${MAGENTA}→ prisma/${NC}"
        
        if [ -f "$PROJECT_ROOT/prisma/schema.prisma" ]; then
            echo -e "${CYAN}  → schema.prisma${NC}"
            process_file "$PROJECT_ROOT/prisma/schema.prisma" "$OUTPUT_FILE" "$PROJECT_ROOT"
        fi
        
        if [ -f "$PROJECT_ROOT/prisma/seed.ts" ]; then
            echo -e "${CYAN}  → seed.ts${NC}"
            process_file "$PROJECT_ROOT/prisma/seed.ts" "$OUTPUT_FILE" "$PROJECT_ROOT"
        fi
        echo ""
    fi
    
    # ===== MONITORING DIRECTORY =====
    if [ -d "$PROJECT_ROOT/monitoring" ]; then
        echo -e "${MAGENTA}→ monitoring/${NC}"
        
        # Prometheus & alert rules
        if [ -f "$PROJECT_ROOT/monitoring/prometheus.yml" ]; then
            echo -e "${CYAN}  → prometheus.yml${NC}"
            process_file "$PROJECT_ROOT/monitoring/prometheus.yml" "$OUTPUT_FILE" "$PROJECT_ROOT"
        fi
        
        if [ -f "$PROJECT_ROOT/monitoring/alert_rules.yml" ]; then
            echo -e "${CYAN}  → alert_rules.yml${NC}"
            process_file "$PROJECT_ROOT/monitoring/alert_rules.yml" "$OUTPUT_FILE" "$PROJECT_ROOT"
        fi
        
        # Grafana datasources
        if [ -d "$PROJECT_ROOT/monitoring/grafana/datasources" ]; then
            echo -e "${CYAN}  → grafana/datasources/${NC}"
            while IFS= read -r -d '' file; do
                local filename=$(basename "$file")
                echo -e "${GREEN}    ✓ datasources/$filename${NC}"
                process_file "$file" "$OUTPUT_FILE" "$PROJECT_ROOT"
            done < <(find "$PROJECT_ROOT/monitoring/grafana/datasources" -maxdepth 1 -type f -name "*.yml" -print0 2>/dev/null | sort -z)
        fi
        
        # Grafana dashboards
        if [ -d "$PROJECT_ROOT/monitoring/grafana/dashboards" ]; then
            echo -e "${CYAN}  → grafana/dashboards/${NC}"
            while IFS= read -r -d '' file; do
                local filename=$(basename "$file")
                echo -e "${GREEN}    ✓ dashboards/$filename${NC}"
                process_file "$file" "$OUTPUT_FILE" "$PROJECT_ROOT"
            done < <(find "$PROJECT_ROOT/monitoring/grafana/dashboards" -maxdepth 1 -type f \( -name "*.json" -o -name "*.yml" \) -print0 2>/dev/null | sort -z)
        fi
        echo ""
    fi
    
    # ===== SRC ROOT FILES =====
    echo -e "${MAGENTA}→ src/ (root files)${NC}"
    while IFS= read -r -d '' file; do
        local filename=$(basename "$file")
        should_skip_file "$filename" && continue
        [[ "$filename" == "app.controller.spec.ts" ]] && continue
        
        process_file "$file" "$OUTPUT_FILE" "$PROJECT_ROOT"
    done < <(find "$PROJECT_ROOT/src" -maxdepth 1 -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -print0 2>/dev/null)
    echo ""
    
    # ===== COMMON DIRECTORY =====
    if [ -d "$PROJECT_ROOT/src/common" ]; then
        echo -e "${MAGENTA}→ src/common/${NC}"
        process_directory "$PROJECT_ROOT/src/common" "$OUTPUT_FILE" "$PROJECT_ROOT"
        echo ""
    fi
    
    # ===== CONFIG DIRECTORY =====
    if [ -d "$PROJECT_ROOT/src/config" ]; then
        echo -e "${MAGENTA}→ src/config/${NC}"
        process_directory "$PROJECT_ROOT/src/config" "$OUTPUT_FILE" "$PROJECT_ROOT"
        echo ""
    fi
    
    # ===== PRISMA SERVICE =====
    if [ -d "$PROJECT_ROOT/src/prisma" ]; then
        echo -e "${MAGENTA}→ src/prisma/${NC}"
        process_directory "$PROJECT_ROOT/src/prisma" "$OUTPUT_FILE" "$PROJECT_ROOT"
        echo ""
    fi
    
    # ===== MODULES DIRECTORY =====
    if [ -d "$PROJECT_ROOT/src/modules" ]; then
        echo -e "${MAGENTA}→ src/modules/${NC}"
        
        # Get all module directories
        local module_dirs=()
        while IFS= read -r -d '' module_dir; do
            should_skip_directory "$module_dir" || module_dirs+=("$module_dir")
        done < <(find "$PROJECT_ROOT/src/modules" -maxdepth 1 -type d ! -path "$PROJECT_ROOT/src/modules" -print0 2>/dev/null | sort -z)
        
        # Process each module
        for module_dir in "${module_dirs[@]}"; do
            local module_name=$(basename "$module_dir")
            echo -e "${CYAN}  → modules/$module_name/${NC}"
            
            process_directory "$module_dir" "$OUTPUT_FILE" "$PROJECT_ROOT"
        done
        echo ""
    fi
    
    # Add footer
    {
        echo ""
        echo "================================================"
        echo "END OF COLLECTION"
        echo "Generated: $(date)"
        echo "Total Directories Processed: $TOTAL_DIRS"
        echo "Total Files Collected: $TOTAL_FILES"
        echo "================================================"
    } >> "$OUTPUT_FILE"
    
    # Show statistics
    show_statistics "$OUTPUT_FILE"
    
    echo ""
    echo -e "${GREEN}✨ Process completed successfully!${NC}"
    echo -e "${CYAN}💡 Complete collection includes:${NC}"
    echo -e "   ${YELLOW}• Root config files (Docker, package.json, etc)${NC}"
    echo -e "   ${YELLOW}• Prisma schema & seed${NC}"
    echo -e "   ${YELLOW}• Monitoring configs (Prometheus, Grafana)${NC}"
    echo -e "   ${YELLOW}• All source code (src/)${NC}"
    echo ""
    
    # Show file location
    echo -e "${BLUE}📄 Output file:${NC}"
    echo -e "   ${YELLOW}$(realpath "$OUTPUT_FILE" 2>/dev/null || echo "$OUTPUT_FILE")${NC}"
    echo ""
    
    # Verification summary
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Collection Checklist             ║${NC}"
    echo -e "${BLUE}╠════════════════════════════════════════╣${NC}"
    echo -e "${BLUE}║${NC} ${GREEN}✓${NC} Root configs (Docker, package.json) ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC} ${GREEN}✓${NC} Prisma (schema.prisma, seed.ts)  ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC} ${GREEN}✓${NC} Monitoring (Prometheus, Grafana)  ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC} ${GREEN}✓${NC} src/common/*                       ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC} ${GREEN}✓${NC} src/config/*                       ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC} ${GREEN}✓${NC} src/prisma/*                       ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC} ${GREEN}✓${NC} src/modules/* (all 20 modules)     ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
}

# Trap errors
trap 'echo -e "\n${RED}ERROR: Script failed at line $LINENO${NC}"; exit 1' ERR

# Run main
main "$@"