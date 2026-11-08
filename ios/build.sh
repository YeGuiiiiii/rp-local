#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ "$(uname -s)" != Darwin ]]; then
    echo "iOS compilation requires macOS and Xcode." >&2
    exit 1
fi
for tool in xcodebuild xcodegen sips; do
    if ! command -v "$tool" >/dev/null; then
        echo "Missing $tool. Install Xcode and run: brew install xcodegen" >&2
        exit 1
    fi
done
if [[ ! -f Resources/site/index.html || ! -f Version.xcconfig ]]; then
    echo "First run node scripts/prepare-ios.cjs from the repository root." >&2
    exit 1
fi
sips -s format png -z 1024 1024 Resources/icon-source.png \
    --out Resources/Assets.xcassets/AppIcon.appiconset/icon.png >/dev/null
xcodegen generate

if [[ "${1:-}" == test ]]; then
    if [[ -z "${IOS_TEST_DESTINATION:-}" ]]; then
        echo 'Set IOS_TEST_DESTINATION to a simulator shown by xcrun simctl list devices available.' >&2
        echo 'Example: IOS_TEST_DESTINATION="platform=iOS Simulator,id=SIMULATOR_UUID" bash build.sh test' >&2
        exit 1
    fi
    xcodebuild test -project RPLocal.xcodeproj -scheme RPLocal \
        -destination "$IOS_TEST_DESTINATION" -derivedDataPath build/DerivedData CODE_SIGNING_ALLOWED=NO
    exit 0
fi

version="$(sed -n 's/^MARKETING_VERSION = //p' Version.xcconfig)"

if [[ "${1:-}" == mac ]]; then
    # Mac Catalyst：苹果芯片要求至少有临时签名才能启动，这里用 ad-hoc 签名（不是开发者签名，首次打开需在系统设置里允许）。
    xcodebuild archive -project RPLocal.xcodeproj -scheme RPLocal -configuration Release \
        -destination 'generic/platform=macOS,variant=Mac Catalyst' -archivePath build/RPLocal-mac.xcarchive \
        CODE_SIGNING_ALLOWED=NO
    rm -rf build/mac && mkdir -p build/mac
    ditto build/RPLocal-mac.xcarchive/Products/Applications/RPLocal.app "build/mac/RP 本地版.app"
    codesign --force --deep --sign - "build/mac/RP 本地版.app"
    codesign --verify --deep --strict "build/mac/RP 本地版.app"
    (cd build/mac && ditto -c -k --sequesterRsrc --keepParent "RP 本地版.app" "../RP-local-${version}-mac.zip")
    echo "Created: $PWD/build/RP-local-${version}-mac.zip (ad-hoc signed)"
    exit 0
fi

xcodebuild archive -project RPLocal.xcodeproj -scheme RPLocal -configuration Release \
    -destination 'generic/platform=iOS' -archivePath build/RPLocal.xcarchive \
    CODE_SIGNING_ALLOWED=NO
mkdir -p build/Payload
ditto build/RPLocal.xcarchive/Products/Applications/RPLocal.app build/Payload/RPLocal.app
(cd build && ditto -c -k --keepParent Payload "RP-local-${version}-unsigned.ipa")
echo "Created: $PWD/build/RP-local-${version}-unsigned.ipa (requires signing before installation)"
