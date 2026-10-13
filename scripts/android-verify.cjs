const fs=require('fs');const path=require('path');const {execFileSync}=require('child_process');
const sdk=process.env.ANDROID_HOME??process.env.ANDROID_SDK_ROOT;if(!sdk)throw new Error('Android SDK not found');
const directories=fs.readdirSync(path.join(sdk,'build-tools')).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));const signer=path.join(sdk,'build-tools',directories.at(-1),'apksigner');
const output=execFileSync(signer,['verify','--print-certs','mobile/android/app/build/outputs/apk/release/app-release.apk'],{encoding:'utf8'});
const fingerprint=/certificate SHA-256 digest:\s*([a-f0-9]+)/i.exec(output)?.[1]?.toUpperCase();
if(!fingerprint||fingerprint!==process.env.STOQO_RELEASE_CERT_SHA256?.replaceAll(':',''))throw new Error('APK signature does not match the permanent Stoqo release key.');
console.log('APK verified with the permanent Stoqo release certificate.');
