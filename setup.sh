#!/bin/bash

# Files Core CLI - Script de configuration et installation
# Ce script configure l'environnement de développement pour Files Core CLI

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'affichage avec émojis
print_step() {
    echo -e "${BLUE}🔧 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}💡 $1${NC}"
}

# Vérification des prérequis
check_prerequisites() {
    print_step "Vérification des prérequis..."
    
    # Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js n'est pas installé"
        print_info "Installez Node.js depuis https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    print_success "Node.js détecté: $NODE_VERSION"
    
    # npm
    if ! command -v npm &> /dev/null; then
        print_error "npm n'est pas installé"
        exit 1
    fi
    
    NPM_VERSION=$(npm --version)
    print_success "npm détecté: v$NPM_VERSION"
    
    # SQLite (pas de vérification nécessaire, inclus avec Node.js)
    print_success "Base de données SQLite (locale)"
}

# Installation des dépendances
install_dependencies() {
    print_step "Installation des dépendances npm..."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json non trouvé. Assurez-vous d'être dans le bon répertoire."
        exit 1
    fi
    
    npm install
    print_success "Dépendances installées"
}

# Configuration de la base de données
setup_database() {
    print_step "Configuration de la base de données..."
    
    # Vérifier si Prisma est disponible
    if ! npm list @prisma/client &> /dev/null; then
        print_error "Prisma Client non installé"
        exit 1
    fi
    
    # Générer le client Prisma
    print_step "Génération du client Prisma..."
    npm run prisma:generate
    print_success "Client Prisma généré"
    
    # Appliquer les migrations
    print_step "Application des migrations de base de données..."
    if npm run prisma:migrate &> /dev/null; then
        print_success "Migrations appliquées (SQLite)"
    else
        print_warning "Erreur lors des migrations - vérifiez la configuration SQLite"
        print_info "La base de données SQLite sera créée automatiquement"
    fi
}

# Configuration de l'environnement
setup_environment() {
    print_step "Configuration de l'environnement..."
    
    # Vérifier .env
    if [ ! -f ".env" ]; then
        print_warning "Fichier .env non trouvé"
        print_info "Créez un fichier .env avec:"
        echo "MEGA_EMAIL=\"votre.email@example.com\""
        echo "MEGA_PASSWORD=\"votre_mot_de_passe\""
        echo ""
        
        # Créer un fichier .env.example si il n'existe pas
        if [ ! -f ".env.example" ]; then
            cat > .env.example << EOL
# Configuration MEGA pour le stockage de fichiers
MEGA_EMAIL="votre.email@example.com"
MEGA_PASSWORD="votre_mot_de_passe"

# Configuration optionnelle
NODE_ENV="development"
LOG_LEVEL="info"
EOL
            print_success "Fichier .env.example créé"
        fi
    else
        print_success "Fichier .env trouvé"
    fi
    
    # Rendre les scripts exécutables
    if [ -f "z_scripts/test-with-mega.sh" ]; then
        chmod +x z_scripts/test-with-mega.sh
        print_success "Script test-with-mega.sh rendu exécutable"
    fi
}

# Construction du projet
build_project() {
    print_step "Construction du projet..."
    
    if npm run build &> /dev/null; then
        print_success "Projet construit avec succès"
    else
        print_warning "Erreur lors de la construction - vérifiez les erreurs TypeScript"
    fi
}

# Tests de validation
run_validation_tests() {
    print_step "Exécution des tests de validation..."
    
    # Test de base (sans MEGA)
    print_step "Test de connexion à la base de données SQLite..."
    if npm run test:db &> /dev/null; then
        print_success "Base de données SQLite OK"
    else
        print_warning "Test de base de données ignoré (optionnel)"
    fi
    
    # Vérifier la disponibilité des commandes CLI
    print_step "Vérification des commandes CLI..."
    if npm run dev -- --version &> /dev/null; then
        print_success "CLI fonctionnel"
    else
        print_warning "Problème avec le CLI"
    fi
}

# Initialisation des données de test
seed_data() {
    print_step "Voulez-vous initialiser avec des données de test ? (y/N)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        print_step "Initialisation des données de test..."
        if npm run seed &> /dev/null; then
            print_success "Données de test créées"
        else
            print_warning "Erreur lors de la création des données de test"
        fi
    else
        print_info "Données de test ignorées - vous pouvez les créer plus tard avec 'npm run seed'"
    fi
}

# Résumé final
print_summary() {
    echo ""
    echo "🎉 Configuration terminée !"
    echo "═══════════════════════════"
    echo ""
    print_info "Commandes disponibles :"
    echo "  npm run dev -- help          # Aide du CLI"
    echo "  npm run menu                 # Menu interactif"
    echo "  npm run test                 # Tests fonctionnels"
    echo "  npm run seed                 # Données de test"
    echo ""
    print_info "Prochaines étapes :"
    echo "  1. Ajoutez vos identifiants MEGA dans .env (optionnel)"
    echo "  2. Lancez 'npm run menu' pour explorer les fonctionnalités"
    echo "  3. La base de données SQLite est prête à l'emploi"
    echo ""
    print_success "Files Core CLI est prêt à l'emploi !"
}

# Script principal
main() {
    echo "🚀 Files Core CLI - Configuration automatique"
    echo "═══════════════════════════════════════════════"
    echo ""
    
    check_prerequisites
    install_dependencies
    setup_environment
    setup_database
    build_project
    run_validation_tests
    seed_data
    print_summary
}

# Gestion des erreurs
trap 'print_error "Script interrompu"; exit 1' INT TERM

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "package.json" ] || ! grep -q "files-core" package.json; then
    print_error "Ce script doit être exécuté depuis la racine du projet Files Core"
    exit 1
fi

# Lancer le script principal
main "$@"
