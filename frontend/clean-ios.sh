#!/bin/bash
echo "🧹 Nettoyage complet iOS..."

# Kill Metro
killall -9 node 2>/dev/null || true

# Clean iOS
cd ios
rm -rf build
rm -rf ~/Library/Developer/Xcode/DerivedData/*
rm -rf ~/Library/Caches/CocoaPods

# Reinstall pods
pod deintegrate
pod install

cd ..

echo "✅ Nettoyage terminé!"
echo "🚀 Lancement de l'app..."
npx react-native run-ios
