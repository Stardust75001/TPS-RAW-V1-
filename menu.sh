#!/bin/zsh

# Menu de workflow GitHub & Shopify
while true; do
  echo "\n==== MENU ===="
  echo "1. Travailler sur la branche main (GitHub TPS-RAW-V1 main)"
  echo "2. Travailler sur la branche dev (GitHub TPS-RAW-V1 DEV)"
  echo "3. Push sur la branche main (GitHub)"
  echo "4. Push sur la branche dev (GitHub)"
  echo "5. Lancer theme-check"
  echo "6. Lancer tous les tests de métriques (Google Console, Cloudflare, Sentry, GA4, Facebook Meta, etc.)"
  echo "7. Commit, merge et vérifier les conflits"
  echo "8. Quitter"
  echo "Choisissez une option (1-8) : "
  read opt
  case $opt in
    1)
      git checkout main
      echo "Vous travaillez maintenant sur la branche main."
      ;;
    2)
      git checkout DEV
      echo "Vous travaillez maintenant sur la branche DEV."
      ;;
    3)
      git add .
      git commit -m "Push via menu script (main)"
      git push origin main
      ;;
    4)
      git add .
      git commit -m "Push via menu script (DEV)"
      git push origin DEV
      ;;
    5)
      theme-check
      ;;
    6)
      echo "Lancement des tests de métriques via push sur la branche courante..."
      CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
      git add .
      git commit -m "Run metrics tests via menu (branche $CURRENT_BRANCH)"
      git push origin $CURRENT_BRANCH
      echo "Push effectué sur la branche $CURRENT_BRANCH. Le workflow GitHub Actions va se lancer."
      echo "Push également sur la branche opposée (main/dev) pour lancer le workflow sur les deux branches..."
      if [ "$CURRENT_BRANCH" = "main" ]; then
        git checkout DEV
        git add .
        git commit -m "Run metrics tests via menu (branche DEV)"
        git push origin DEV
        git checkout main
        echo "Push effectué sur DEV."
      elif [ "$CURRENT_BRANCH" = "DEV" ]; then
        git checkout main
        git add .
        git commit -m "Run metrics tests via menu (branche main)"
        git push origin main
        git checkout DEV
        echo "Push effectué sur main."
      fi
      ;;
    7)
      echo "Sur quelle branche voulez-vous effectuer le commit, merge et check des conflits ? (main/dev) : "
      read BRANCH_CHOICE
      if [ "$BRANCH_CHOICE" != "main" ] && [ "$BRANCH_CHOICE" != "DEV" ]; then
        echo "Choix invalide. Opération annulée."
      else
        git checkout $BRANCH_CHOICE
        git add .
        git commit -m "Commit avant merge via menu ($BRANCH_CHOICE)" || echo "Aucun changement à commit."
        git fetch origin $BRANCH_CHOICE
        git merge origin/$BRANCH_CHOICE
        if [ $? -eq 0 ]; then
          echo "Merge réussi sur $BRANCH_CHOICE."
        else
          echo "Conflits détectés sur $BRANCH_CHOICE ! Veuillez les résoudre manuellement."
        fi
      fi
      ;;
    8)
      echo "Sortie du menu."
      break
      ;;
    *)
      echo "Option invalide. Choisissez 1-8."
      ;;
  esac
done
