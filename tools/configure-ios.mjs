import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'config/native.json'), 'utf8'));
if (!/^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*){2,}$/.test(config.appId)) throw new Error('Invalid Bundle ID');
if (!config.removeAdsProductId.startsWith(config.appId + '.')) throw new Error('Product ID must use the app Bundle ID prefix');
if (!/^ca-app-pub-\d{16}~\d{10}$/.test(config.admobIosAppId)) throw new Error('Invalid AdMob application ID');
for (const key of ['admobIosRewardedId', 'admobIosInterstitialId']) {
  if (!/^ca-app-pub-\d{16}\/\d{10}$/.test(config[key])) throw new Error('Invalid AdMob unit ID: ' + key);
}
if (!['test', 'production'].includes(config.adsMode)) throw new Error('Invalid adsMode');
const ids = [config.admobIosAppId, config.admobIosRewardedId, config.admobIosInterstitialId];
if (config.adsMode === 'test' && !ids.every((id) => id.startsWith('ca-app-pub-3940256099942544'))) throw new Error('Test builds must use Google demo IDs');
if (process.argv.includes('--release') && (config.adsMode !== 'production' || ids.some((id) => id.includes('3940256099942544')))) {
  throw new Error('Release blocked: Google demo IDs/test mode still configured');
}
const plistPath = path.join(root, 'ios/App/App/Info.plist');
let plist = fs.readFileSync(plistPath, 'utf8');
const xml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function setValue(key, value) {
  const entry = `<key>${key}</key>\n\t${value}`;
  const matcher = new RegExp(`<key>${key}</key>\\s*(?:<string>[\\s\\S]*?</string>|<(?:true|false)\\s*/>)`);
  plist = matcher.test(plist) ? plist.replace(matcher, () => entry) : plist.replace(/<\/dict>\s*<\/plist>\s*$/, `${entry}\n</dict>\n</plist>\n`);
}
setValue('CFBundleDisplayName', `<string>${xml(config.appName)}</string>`);
setValue('GADApplicationIdentifier', `<string>${config.admobIosAppId}</string>`);
setValue('GADDelayAppMeasurementInit', '<true/>');
setValue('PuzzleRemoveAdsProductId', `<string>${config.removeAdsProductId}</string>`);
if (!plist.includes('<key>SKAdNetworkItems</key>')) {
  plist = plist.replace(/<\/dict>\s*<\/plist>\s*$/, '<key>SKAdNetworkItems</key>\n<array><dict><key>SKAdNetworkIdentifier</key><string>cstr6suwn9.skadnetwork</string></dict></array>\n</dict>\n</plist>\n');
}
plist = plist.replace(/(<key>UISupportedInterfaceOrientations<\/key>\s*)<array>[\s\S]*?<\/array>/, '$1<array><string>UIInterfaceOrientationPortrait</string></array>');
fs.writeFileSync(plistPath, plist);

const projectPath = path.join(root, 'ios/App/App.xcodeproj/project.pbxproj');
let project = fs.readFileSync(projectPath, 'utf8')
  .replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${config.appId};`)
  .replace(/TARGETED_DEVICE_FAMILY = [^;]+;/g, 'TARGETED_DEVICE_FAMILY = 1;');
project = project.replace(/(CODE_SIGN_STYLE = Automatic;)(?!\s*CODE_SIGN_ENTITLEMENTS)/g, '$1\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;');
const entitlementsPath = path.join(root, 'ios/App/App/App.entitlements');
fs.writeFileSync(entitlementsPath, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>com.apple.developer.icloud-container-identifiers</key><array><string>iCloud.${config.appId}</string></array>
<key>com.apple.developer.icloud-services</key><array><string>CloudKit</string></array>
</dict></plist>
`);
if (!project.includes('PrivacyInfo.xcprivacy in Resources')) {
  const buildId = 'EEDDAA001122334455667788', fileId = 'EEDDAA001122334455667789';
  project = project.replace('/* Begin PBXBuildFile section */', `/* Begin PBXBuildFile section */\n\t\t${buildId} /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = ${fileId} /* PrivacyInfo.xcprivacy */; };`);
  project = project.replace('/* Begin PBXFileReference section */', `/* Begin PBXFileReference section */\n\t\t${fileId} /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };`);
  project = project.replace(/(504EC3061FED79650016851F \/\* App \*\/ = \{[\s\S]*?children = \()/, `$1\n\t\t\t\t${fileId} /* PrivacyInfo.xcprivacy */,`);
  project = project.replace(/(isa = PBXResourcesBuildPhase;[\s\S]*?files = \()/, `$1\n\t\t\t\t${buildId} /* PrivacyInfo.xcprivacy in Resources */,`);
}
fs.writeFileSync(projectPath, project);
console.log(`Configured iPhone app: ${config.appId}; ads=${config.adsMode}; product=${config.removeAdsProductId}`);
console.log('Native compile/signing and complete SDK privacy/SKAdNetwork review still require Xcode on Mac.');
