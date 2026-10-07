// Writes the files that let the website's links open the store apps (universal links on
// iOS, app links on Android). Run once the Apple Team ID and the Play app signing
// certificate are known:
//   APPLE_TEAM_ID=ABCDE12345 PLAY_SHA256=AA:BB:… node tools/well-known.mjs
// then deploy, and add "applinks:<domain>" under Associated Domains in Xcode.
import fs from 'node:fs';
const team = process.env.APPLE_TEAM_ID, sha = process.env.PLAY_SHA256, id = 'com.bistroisland.app';
if (!team && !sha) { console.error('set APPLE_TEAM_ID and/or PLAY_SHA256'); process.exit(1); }
fs.mkdirSync('.well-known', { recursive: true });
if (team) fs.writeFileSync('.well-known/apple-app-site-association', JSON.stringify({ applinks: { details: [{ appIDs: [`${team}.${id}`], components: [{ '?': { friend: '?*' } }, { '#': '*access_token*' }] }] } }, null, 2));
if (sha) fs.writeFileSync('.well-known/assetlinks.json', JSON.stringify([{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: id, sha256_cert_fingerprints: sha.split(',') } }], null, 2));
console.log('written: .well-known/', team ? 'apple-app-site-association' : '', sha ? 'assetlinks.json' : '');
