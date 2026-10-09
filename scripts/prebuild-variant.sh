#!/bin/sh
# Prebuilds android/ again when it was last generated for a different app variant,
# so e.g. a dev build can never install over the preview app.
set -e

variant=$1
case $variant in
  development) package=com.tomimarkus991.impulse.dev ;;
  preview) package=com.tomimarkus991.impulse.preview ;;
  *) echo "Unknown variant: $variant" >&2; exit 1 ;;
esac

if ! grep -q "applicationId '$package'" android/app/build.gradle 2>/dev/null; then
  echo "android/ is not set up for $package, running prebuild --clean"
  EXPO_PUBLIC_APP_VARIANT=$variant npx expo prebuild --clean --platform android
fi
